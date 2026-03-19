// src/views/ChatView/MessageList.tsx
import { useEffect, useRef } from 'react'
import { MessageBubble } from '../../components/MessageBubble'
import { DateSeparator } from '../../components/DateSeparator'
import { useAppStore } from '../../store/useAppStore'
import { isDifferentDay } from '../../utils/formatDate'
import type { Message } from '../../types'

export function MessageList() {
  const activeChatId = useAppStore((s) => s.activeChatId)
  const chats = useAppStore((s) => s.chats)
  const currentUser = useAppStore((s) => s.currentUser)
  const bottomRef = useRef<HTMLDivElement>(null)

  const chat = chats.find((c) => c.id === activeChatId)
  const messages: Message[] = chat?.messages ?? []

  // Auto-scroll on new message or chat switch
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, activeChatId])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-chat-hint">
          Aún no hay mensajes. ¡Di algo!
        </p>
      </div>
    )
  }

  // Build render list with date separators and grouping info
  type RenderItem =
    | { kind: 'separator'; date: Date; key: string }
    | { kind: 'message'; message: Message; isMine: boolean; isFirst: boolean; key: string }

  const items: RenderItem[] = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const prev = messages[i - 1]

    // Date separator when day changes
    if (!prev || isDifferentDay(new Date(prev.timestamp), new Date(msg.timestamp))) {
      items.push({ kind: 'separator', date: new Date(msg.timestamp), key: `sep-${i}` })
    }

    const isMine = msg.senderId === currentUser?.id
    const isFirst =
      !prev ||
      prev.senderId !== msg.senderId ||
      isDifferentDay(new Date(prev.timestamp), new Date(msg.timestamp))

    items.push({ kind: 'message', message: msg, isMine, isFirst, key: msg.id })
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-1">
      {items.map((item) =>
        item.kind === 'separator' ? (
          <DateSeparator key={item.key} date={item.date} />
        ) : (
          <MessageBubble
            key={item.key}
            message={item.message}
            isMine={item.isMine}
            isFirst={item.isFirst}
          />
        )
      )}
      <div ref={bottomRef} />
    </div>
  )
}
