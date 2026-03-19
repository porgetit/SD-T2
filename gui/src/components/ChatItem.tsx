// src/components/ChatItem.tsx
import { Avatar } from './Avatar'
import { formatRelativeTime } from '../utils/formatDate'
import type { Chat } from '../types'

interface ChatItemProps {
  chat: Chat
  peerId: string
  isSelected: boolean
  onClick: () => void
}

export function ChatItem({ chat, peerId, isSelected, onClick }: ChatItemProps) {
  const lastMsg = chat.messages[chat.messages.length - 1]
  const preview = lastMsg?.text ?? ''

  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-[10px] px-3 py-[10px] text-left transition-colors',
        isSelected ? 'bg-chat-surface' : 'bg-white hover:bg-[#F9F9F9]',
      ].join(' ')}
    >
      <Avatar username={peerId} size={40} />

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{peerId}</p>
        {preview && (
          <p className="text-[12px] text-chat-muted truncate mt-[2px]">{preview}</p>
        )}
      </div>

      <span className="text-[11px] text-chat-muted flex-shrink-0 self-start mt-[2px]">
        {formatRelativeTime(chat.lastActivity)}
      </span>
    </button>
  )
}
