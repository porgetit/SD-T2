// src/components/SearchBar.tsx
import { useState, useRef, useEffect } from 'react'
import { Avatar } from './Avatar'
import { useAppStore } from '../store/useAppStore'
import type { User } from '../types'

interface SearchBarProps {
  onSelectUser: (username: string) => void
}

export function SearchBar({ onSelectUser }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const knownUsers = useAppStore((s) => s.knownUsers)
  const currentUser = useAppStore((s) => s.currentUser)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const results: User[] = query.trim().length === 0
    ? []
    : knownUsers.filter(
        (u) =>
          u.username !== currentUser?.username &&
          u.username.toLowerCase().includes(query.toLowerCase())
      )

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(username: string) {
    onSelectUser(username)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative px-3 py-[10px]">
      {/* Input */}
      <div className="relative flex items-center">
        {/* Lupa */}
        <svg
          className="absolute left-3 pointer-events-none text-chat-hint"
          width="13" height="13" viewBox="0 0 13 13"
          fill="none" stroke="currentColor" strokeWidth="1.6"
        >
          <circle cx="5.5" cy="5.5" r="4" />
          <line x1="9" y1="9" x2="12.5" y2="12.5" />
        </svg>
        <input
          id="user-search"
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar usuarios…"
          autoComplete="off"
          className="w-full h-[34px] bg-chat-surface rounded-full pl-8 pr-3 text-[12px] text-[#1A1A1A] placeholder-chat-hint outline-none border-none"
        />
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-chat-border rounded-xl shadow-sm z-20 overflow-hidden">
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => handleSelect(user.username)}
              className="w-full flex items-center gap-3 px-3 py-[10px] hover:bg-chat-surface transition-colors text-left"
            >
              <Avatar username={user.username} size={32} />
              <span className="text-[13px] font-medium text-[#1A1A1A] truncate flex-1">
                {user.username}
              </span>
              <span className="text-[11px] text-chat-hint bg-chat-surface px-2 py-[2px] rounded-full">
                Nuevo chat
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {open && query.trim().length > 0 && results.length === 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-chat-border rounded-xl z-20 px-3 py-3">
          <p className="text-[12px] text-chat-muted text-center">
            No se encontró "{query}"
          </p>
        </div>
      )}
    </div>
  )
}
