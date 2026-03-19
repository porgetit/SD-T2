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
  contacts: string[]

  // ── Chats ─────────────────────────────────────────────────────
  chats: Chat[]
  activeChatId: string | null
  setActiveChat: (chatId: string) => void
  getOrCreateChat: (peerId: string) => Chat
  sendMessage: (text: string) => Promise<void>

  // ── WebSocket event processor ─────────────────────────────────
  onWsEvent: (event: WsEvent) => void
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
      contacts: [],
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
  contacts: [],

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
    const { activeChatId, currentUser, chats } = get()
    if (!activeChatId || !currentUser) return

    const chat = chats.find(c => c.id === activeChatId)
    const peerId = chat?.participantIds.find(id => id !== currentUser.id)
    if (!peerId) return

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
      await api.sendMessage(peerId, text)
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

  // ── WS event processor ────────────────────────────────────────
  onWsEvent: (event) => {
    const { currentUser, getOrCreateChat } = get()

    switch (event.type) {
      // ── Auth ─────────────────────────────────────────────────────────────
      case 'AUTH_OK': {
        const nick = event.payload.nickname as string || currentUser?.username || ''
        const avatar = event.payload.avatar_b64 as string | undefined
        const serverContactsData = (event.payload.contacts_data as any[]) || []
        
        const contactsList = serverContactsData.map(c => c.username)
        const contactsProfiles = serverContactsData.map(c => ({ id: c.username, username: c.username, ...(c.avatar_b64 ? { avatarUrl: c.avatar_b64 } : {}) }))

        set((s) => {
          const merged = [...s.knownUsers]
          for (const cp of contactsProfiles) {
            const idx = merged.findIndex(u => u.id === cp.id)
            if (idx >= 0) merged[idx] = { ...merged[idx], ...cp }
            else merged.push(cp)
          }
          return {
            connectionState: 'CONNECTED',
            currentUser: { id: nick, username: nick, ...(avatar ? { avatarUrl: avatar } : {}) },
            contacts: contactsList,
            knownUsers: merged,
          }
        })
        break
      }

      case 'AUTH_FAIL':
        set({ connectionState: 'DISCONNECTED', currentUser: null })
        break



      case 'USER_LIST': {
        const usersData = (event.payload.users_data as any[]) ?? []
        set((s) => {
          const newUsers = usersData
            .filter((u) => u.username !== currentUser?.username)
            .map((u) => ({ id: u.username, username: u.username, ...(u.avatar_b64 ? { avatarUrl: u.avatar_b64 } : {}) }))
          
          const merged = [...s.knownUsers]
          for (const nu of newUsers) {
            const idx = merged.findIndex(u => u.id === nu.id)
            if (idx >= 0) merged[idx] = { ...merged[idx], ...nu }
            else merged.push(nu)
          }
          return { knownUsers: merged }
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

      case 'CONTACT_ACCEPTED': {
        const contactData = event.payload.contact_data as any
        if (!contactData) return
        set((s) => {
          const newUser = { id: contactData.username, username: contactData.username, ...(contactData.avatar_b64 ? { avatarUrl: contactData.avatar_b64 } : {}) }
          const merged = [...s.knownUsers]
          const idx = merged.findIndex(u => u.id === newUser.id)
          if (idx >= 0) merged[idx] = { ...merged[idx], ...newUser }
          else merged.push(newUser)
          
          return { 
            contacts: [...s.contacts, contactData.username],
            knownUsers: merged
          }
        })
        break
      }

      case 'USER_JOINED':
        set((s) => {
          const avatar = event.payload.avatar_b64 as string | undefined
          const newUser = { id: event.sender, username: event.sender, ...(avatar ? { avatarUrl: avatar } : {}) }
          const merged = [...s.knownUsers]
          const idx = merged.findIndex(u => u.id === event.sender)
          if (idx >= 0) merged[idx] = { ...merged[idx], ...newUser }
          else merged.push(newUser)
          return { knownUsers: merged }
        })
        break

      case 'USER_LEFT':
        set((s) => ({ knownUsers: s.knownUsers.filter((u) => u.username !== event.sender) }))
        break
    }
  },
}))
