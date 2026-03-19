// src/views/ChatView/ChatArea.tsx
import { Avatar } from '../../components/Avatar'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { useAppStore } from '../../store/useAppStore'

export function ChatArea() {
  const activeChatId = useAppStore((s) => s.activeChatId)
  const chats = useAppStore((s) => s.chats)
  const currentUser = useAppStore((s) => s.currentUser)

  const chat = chats.find((c) => c.id === activeChatId)
  const peerId = chat?.participantIds.find((id) => id !== currentUser?.id) ?? ''

  // ── Empty state ───────────────────────────────────────────────
  if (!chat || !activeChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white">
        <div className="w-12 h-12 bg-chat-yellow rounded-full flex items-center justify-center text-[22px] font-bold text-[#1A1A1A]">
          C
        </div>
        <p className="text-[14px] text-chat-muted">Selecciona un chat para comenzar</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">

      {/* Header */}
      <div className="h-14 px-5 flex items-center gap-3 border-b border-chat-border flex-shrink-0">
        <Avatar username={peerId} size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[#1A1A1A] truncate">{peerId}</p>
        </div>

      </div>

      {/* Messages */}
      <MessageList />

      {/* Input */}
      <MessageInput />
    </div>
  )
}
