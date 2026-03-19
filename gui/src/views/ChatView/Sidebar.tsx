// src/views/ChatView/Sidebar.tsx
import { useState } from 'react'
import { Avatar } from '../../components/Avatar'
import { ChatItem } from '../../components/ChatItem'
import { SearchBar } from '../../components/SearchBar'
import { AccountPanel } from '../../components/AccountPanel'
import { useAppStore } from '../../store/useAppStore'

export function Sidebar() {
  const currentUser = useAppStore((s) => s.currentUser)
  const chats = useAppStore((s) => s.chats)
  const activeChatId = useAppStore((s) => s.activeChatId)
  const setActiveChat = useAppStore((s) => s.setActiveChat)
  const requestChat = useAppStore((s) => s.requestChat)
  const pendingRequest = useAppStore((s) => s.pendingRequest)
  const acceptChat = useAppStore((s) => s.acceptChat)
  const rejectChat = useAppStore((s) => s.rejectChat)
  const connectionState = useAppStore((s) => s.connectionState)

  const [panelOpen, setPanelOpen] = useState(false)

  // Sort chats by lastActivity desc
  const sortedChats = [...chats].sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  )

  async function handleSelectUser(username: string) {
    await requestChat(username)
  }

  function getPeerId(chat: { participantIds: string[] }): string {
    return chat.participantIds.find((id) => id !== currentUser?.id) ?? ''
  }

  const statusColor: Record<string, string> = {
    DISCONNECTED: '#E8E8E8',
    CONNECTING: '#FFC107',
    CONNECTED: '#4CAF50',
    IN_SESSION: '#FFFC00',
  }

  return (
    <div className="w-[220px] min-w-[220px] flex flex-col border-r border-chat-border bg-white relative">

      {/* Header */}
      <div className="h-14 px-3 flex items-center gap-[10px] border-b border-chat-border flex-shrink-0">
        <Avatar
          username={currentUser?.username ?? ''}
          avatarUrl={currentUser?.avatarUrl}
          size={36}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[#1A1A1A] truncate">
            {currentUser?.username}
          </p>
          <div className="flex items-center gap-1 mt-[1px]">
            <div
              className="w-[7px] h-[7px] rounded-full flex-shrink-0"
              style={{ background: statusColor[connectionState] ?? '#E8E8E8' }}
            />
            <span className="text-[10px] text-chat-hint capitalize">
              {connectionState.toLowerCase().replace('_', ' ')}
            </span>
          </div>
        </div>
        <button
          onClick={() => setPanelOpen((v) => !v)}
          aria-label="Gestión de cuenta"
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-chat-surface transition-colors flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
            stroke="#8E8E8E" strokeWidth="1.4" strokeLinecap="round">
            <circle cx="8" cy="8" r="2.5"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2
              M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41
              M11.66 4.34l1.41-1.41M2.93 13.07l1.41-1.41"/>
          </svg>
        </button>
      </div>

      {/* Pending chat request banner */}
      {pendingRequest && (
        <div className="mx-3 mt-3 bg-[#FFFAE6] border border-[#FFDB58] rounded-xl p-3 flex-shrink-0">
          <p className="text-[12px] font-medium text-[#7A6000] mb-2">
            <span className="font-bold">{pendingRequest}</span> quiere chatear
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => void acceptChat()}
              className="flex-1 h-7 bg-chat-yellow text-[#1A1A1A] text-[11px] font-bold rounded-lg"
            >
              Aceptar
            </button>
            <button
              onClick={() => void rejectChat()}
              className="flex-1 h-7 bg-white border border-chat-border text-chat-muted text-[11px] rounded-lg"
            >
              Rechazar
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <SearchBar onSelectUser={handleSelectUser} />

      {/* Chats label */}
      <p className="text-[10px] text-chat-hint uppercase tracking-[0.5px] px-3 pb-1 flex-shrink-0">
        Chats
      </p>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {sortedChats.length === 0 ? (
          <p className="text-[12px] text-chat-hint text-center px-4 pt-6">
            Busca un usuario para iniciar un chat
          </p>
        ) : (
          sortedChats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              peerId={getPeerId(chat)}
              isSelected={chat.id === activeChatId}
              onClick={() => setActiveChat(chat.id)}
            />
          ))
        )}
      </div>

      {/* Account panel */}
      <AccountPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />
    </div>
  )
}
