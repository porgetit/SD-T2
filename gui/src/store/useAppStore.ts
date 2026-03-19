// src/store/useAppStore.ts
import { create } from 'zustand'
import { api } from '../api/client'
import type { User, Message, Chat, ConnectionState, WsEvent } from '../types'

interface AppStore {
  // ── Auth ──────────────────────────────────────────────────────
  currentUser: User | null
  serverUrl: string
  setServerUrl: (url: string) => void
  register: (serverUrl: string, username: string, password: string, avatarUrl?: string) => Promise<void>
  login: (serverUrl: string, nickname: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateAccount: (username: string, avatarUrl?: string, password?: string) => Promise<void>

  // ── Connection ────────────────────────────────────────────────
  connectionState: ConnectionState
  setConnectionState: (state: ConnectionState) => void

  // ── Users ─────────────────────────────────────────────────────
  knownUsers: User[]

  // ── Chats ─────────────────────────────────────────────────────
  chats: Chat[]
  activeChatId: string | null
  setActiveChat: (chatId: string) => void
  getOrCreateChat: (peerId: string) => Chat
  sendMessage: (text: string) => Promise<void>
  requestChat: (username: string) => Promise<void>
  acceptChat: () => Promise<void>
  rejectChat: () => Promise<void>
  endChat: () => Promise<void>

  // ── WebSocket event processor ─────────────────────────────────
  onWsEvent: (event: WsEvent) => void

  // ── Pending chat requests ─────────────────────────────────────
  pendingRequest: string | null  // username of who is requesting a chat
  clearPendingRequest: () => void
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export const useAppStore = create<AppStore>((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────
  currentUser: null,
  serverUrl: 'ws://localhost:5000',

  setServerUrl: (url) => set({ serverUrl: url }),

  register: async (serverUrl, username, password, avatarUrl) => {
    set({ connectionState: 'CONNECTING', serverUrl })
    // register() es async — la confirmación llega por WS (AUTH_OK event)
    await api.register(serverUrl, username, password, avatarUrl)
    // Guardamos el usuario provisionalmente; AUTH_OK lo confirma
    set({ currentUser: { id: username, username, avatarUrl }, connectionState: 'CONNECTING' })
  },

  login: async (serverUrl, nickname, password) => {
    set({ connectionState: 'CONNECTING', serverUrl })
    await api.connect(serverUrl, nickname, password)
    // El AUTH_OK por WS actualizará connectionState a CONNECTED
    set({ currentUser: { id: nickname, username: nickname }, connectionState: 'CONNECTING' })
  },

  logout: async () => {
    try { await api.disconnect() } catch { /* ignore */ }
    set({
      currentUser: null,
      connectionState: 'DISCONNECTED',
      chats: [],
      activeChatId: null,
      knownUsers: [],
      pendingRequest: null,
    })
  },

  updateAccount: async (username, avatarUrl, password) => {
    await api.updateAccount(username, password)
    set((s) => ({
      currentUser: s.currentUser
        ? { ...s.currentUser, username, ...(avatarUrl ? { avatarUrl } : {}) }
        : null,
    }))
  },

  // ── Connection ────────────────────────────────────────────────
  connectionState: 'DISCONNECTED',
  setConnectionState: (state) => set({ connectionState: state }),

  // ── Users ─────────────────────────────────────────────────────
  knownUsers: [],

  // ── Chats ─────────────────────────────────────────────────────
  chats: [],
  activeChatId: null,

  setActiveChat: (chatId) => set({ activeChatId: chatId }),

  getOrCreateChat: (peerId) => {
    const { chats, currentUser } = get()
    const myId = currentUser?.id ?? ''
    const existing = chats.find(
      (c) => c.participantIds.includes(peerId) && c.participantIds.includes(myId)
    )
    if (existing) return existing

    const newChat: Chat = {
      id: makeId(),
      participantIds: [myId, peerId],
      messages: [],
      lastActivity: new Date(),
    }
    set((s) => ({ chats: [newChat, ...s.chats] }))
    return newChat
  },

  sendMessage: async (text) => {
    const { activeChatId, currentUser } = get()
    if (!activeChatId || !currentUser) return

    // Optimistic update
    const msg: Message = {
      id: makeId(),
      senderId: currentUser.id,
      text,
      timestamp: new Date(),
    }
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === activeChatId
          ? { ...c, messages: [...c.messages, msg], lastActivity: new Date() }
          : c
      ),
    }))

    try {
      await api.sendMessage(text)
    } catch {
      // Rollback on failure
      set((s) => ({
        chats: s.chats.map((c) =>
          c.id === activeChatId
            ? { ...c, messages: c.messages.filter((m) => m.id !== msg.id) }
            : c
        ),
      }))
    }
  },

  requestChat: async (username) => {
    await api.requestChat(username)
    const chat = get().getOrCreateChat(username)
    set({ activeChatId: chat.id })
  },

  acceptChat: async () => {
    await api.acceptChat()
    const { pendingRequest } = get()
    if (pendingRequest) {
      const chat = get().getOrCreateChat(pendingRequest)
      set({ activeChatId: chat.id, connectionState: 'IN_SESSION', pendingRequest: null })
    }
  },

  rejectChat: async () => {
    await api.rejectChat()
    set({ pendingRequest: null })
  },

  endChat: async () => {
    await api.endChat()
    set({ connectionState: 'CONNECTED', activeChatId: null })
  },

  // ── WS event processor ────────────────────────────────────────
  onWsEvent: (event) => {
    const { currentUser, getOrCreateChat } = get()

    switch (event.type) {
      // ── Auth ─────────────────────────────────────────────────────────────
      case 'AUTH_OK': {
        const nick = event.payload.nickname as string || currentUser?.username || ''
        const avatar = event.payload.avatar_b64 as string | undefined
        set({
          connectionState: 'CONNECTED',
          currentUser: { id: nick, username: nick, ...(avatar ? { avatarUrl: avatar } : {}) },
        })
        break
      }

      case 'AUTH_FAIL':
        set({ connectionState: 'DISCONNECTED', currentUser: null })
        break

      case 'REGISTER_OK': {
        // login de inmediato tras registro: el store ya tiene el usuario provisional
        set({ connectionState: 'CONNECTED' })
        break
      }

      case 'USER_LIST': {
        const users = (event.payload.users as string[]) ?? []
        set({
          knownUsers: users
            .filter((u) => u !== currentUser?.username)
            .map((u) => ({ id: u, username: u })),
        })
        break
      }

      case 'TEXT': {
        const text = event.payload.text as string
        const senderId = event.sender
        const chat = getOrCreateChat(senderId)
        const msg: Message = {
          id: makeId(),
          senderId,
          text,
          timestamp: new Date(),
        }
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chat.id
              ? { ...c, messages: [...c.messages, msg], lastActivity: new Date() }
              : c
          ),
        }))
        break
      }

      case 'REQUEST_CHAT':
        set({ pendingRequest: event.sender })
        break

      case 'ACCEPT_CHAT': {
        const chat = getOrCreateChat(event.sender)
        set({ activeChatId: chat.id, connectionState: 'IN_SESSION' })
        break
      }

      case 'REJECT_CHAT':
        set({ connectionState: 'CONNECTED' })
        break

      case 'END_CHAT':
        set({ connectionState: 'CONNECTED', activeChatId: null })
        break

      case 'USER_JOINED':
        set((s) => {
          const already = s.knownUsers.find((u) => u.username === event.sender)
          if (already) return s
          return { knownUsers: [...s.knownUsers, { id: event.sender, username: event.sender }] }
        })
        break

      case 'USER_LEFT':
        set((s) => ({ knownUsers: s.knownUsers.filter((u) => u.username !== event.sender) }))
        break
    }
  },

  // ── Pending requests ──────────────────────────────────────────
  pendingRequest: null,
  clearPendingRequest: () => set({ pendingRequest: null }),
}))
