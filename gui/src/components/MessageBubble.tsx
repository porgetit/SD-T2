// src/components/MessageBubble.tsx
import { Avatar } from './Avatar'
import type { Message } from '../types'

interface MessageBubbleProps {
  message: Message
  isMine: boolean
  isFirst: boolean   // first in a consecutive group from same sender
}

export function MessageBubble({ message, isMine, isFirst }: MessageBubbleProps) {
  const AVATAR_SIZE = 28
  const AVATAR_SPACE = AVATAR_SIZE + 8 // 28px + gap-2

  return (
    <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>

      {/* Avatar or placeholder spacer (left side only) */}
      {!isMine && (
        <div style={{ width: AVATAR_SIZE, flexShrink: 0 }}>
          {isFirst ? (
            <Avatar username={message.senderId} size={AVATAR_SIZE} />
          ) : (
            <div style={{ width: AVATAR_SIZE }} />
          )}
        </div>
      )}

      {/* Content column */}
      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[60%]`}>
        {/* Sender label — only on first message in group */}
        {isFirst && !isMine && (
          <span className="text-[10px] text-chat-hint mb-1 ml-1 select-none">
            {message.senderId.toUpperCase()}
          </span>
        )}

        {/* Bubble */}
        <div
          className={[
            'px-3 py-2 text-[13px] leading-relaxed break-words',
            isMine
              ? 'bg-chat-surface text-[#1A1A1A] rounded-[18px] rounded-tr-sm'
              : 'bg-white border border-chat-border text-[#1A1A1A] rounded-[18px] rounded-tl-sm',
          ].join(' ')}
        >
          {message.text}
        </div>
      </div>

      {/* Right-side spacer so our messages align consistently */}
      {isMine && <div style={{ width: AVATAR_SPACE, flexShrink: 0 }} />}
    </div>
  )
}
