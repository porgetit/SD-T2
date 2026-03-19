// src/views/ChatView/MessageInput.tsx
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { useAppStore } from '../../store/useAppStore'

export function MessageInput() {
  const [text, setText] = useState('')
  const sendMessage = useAppStore((s) => s.sendMessage)
  const activeChatId = useAppStore((s) => s.activeChatId)

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || !activeChatId) return
    setText('')
    await sendMessage(trimmed)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void handleSend()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="px-4 py-3 border-t border-chat-border flex-shrink-0"
    >
      <div className="relative flex items-center">
        <label htmlFor="message-input" className="sr-only">Escribe un mensaje</label>
        <input
          id="message-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje…"
          autoComplete="off"
          className="w-full h-11 bg-chat-surface rounded-full pl-5 pr-12 text-[14px] text-[#1A1A1A] placeholder-chat-hint outline-none border-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Enviar mensaje"
          className={`absolute right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            text.trim()
              ? 'bg-[#1A1A1A] text-white hover:bg-[#333]'
              : 'bg-chat-border text-chat-muted cursor-not-allowed'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="13" x2="7" y2="1"/>
            <polyline points="1 7 7 1 13 7"/>
          </svg>
        </button>
      </div>
    </form>
  )
}
