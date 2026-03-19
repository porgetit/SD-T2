// src/components/AccountPanel.tsx
import { useState, useRef, useEffect, type ChangeEvent } from 'react'
import { Avatar } from './Avatar'
import { useAppStore } from '../store/useAppStore'
import { useNavigate } from 'react-router-dom'

interface AccountPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function AccountPanel({ isOpen, onClose }: AccountPanelProps) {
  const currentUser = useAppStore((s) => s.currentUser)
  const updateAccount = useAppStore((s) => s.updateAccount)
  const logout = useAppStore((s) => s.logout)
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  const [username, setUsername] = useState(currentUser?.username ?? '')
  const [password, setPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sync username if currentUser changes
  useEffect(() => {
    setUsername(currentUser?.username ?? '')
    setAvatarUrl(currentUser?.avatarUrl ?? '')
  }, [currentUser])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose])

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!username.trim()) return
    setSaving(true)
    try {
      await updateAccount(username.trim(), avatarUrl || undefined, password || undefined)
      setPassword('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className="absolute right-4 top-[64px] w-[240px] bg-white border border-chat-border rounded-xl z-30 overflow-hidden"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
    >
      {/* Title */}
      <div className="px-4 py-4 border-b border-chat-border">
        <h2 className="text-[15px] font-bold text-[#1A1A1A]">Mi cuenta</h2>
      </div>

      {/* Avatar section */}
      <div className="flex flex-col items-center gap-2 pt-4 pb-2 px-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label="Cambiar foto de perfil"
          className="relative group"
        >
          <Avatar
            username={currentUser?.username ?? ''}
            avatarUrl={avatarUrl || undefined}
            size={72}
          />
          <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="2" y="6" width="16" height="12" rx="2"/>
              <circle cx="10" cy="12" r="3"/>
              <path d="M7 6l1.5-3h3L13 6"/>
            </svg>
          </div>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-[12px] text-chat-muted underline underline-offset-2"
        >
          Cambiar foto
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      {/* Fields */}
      <div className="px-4 pb-4 flex flex-col gap-3">
        <div>
          <label htmlFor="account-username" className="text-[11px] text-chat-muted block mb-1">
            Nombre de usuario
          </label>
          <input
            id="account-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full h-[36px] bg-chat-surface rounded-lg px-3 text-[13px] text-[#1A1A1A] outline-none border border-transparent focus:border-chat-border"
          />
        </div>

        <div>
          <label htmlFor="account-password" className="text-[11px] text-chat-muted block mb-1">
            Nueva contraseña
          </label>
          <input
            id="account-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full h-[36px] bg-chat-surface rounded-lg px-3 text-[13px] text-[#1A1A1A] placeholder-chat-hint outline-none border border-transparent focus:border-chat-border"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !username.trim()}
          className="w-full h-[38px] bg-chat-yellow text-[#1A1A1A] text-[13px] font-bold rounded-lg disabled:opacity-50 hover:bg-yellow-300 transition-colors"
        >
          {saved ? '✓ Guardado' : saving ? 'Guardando…' : 'Guardar cambios'}
        </button>

        <button
          onClick={handleLogout}
          className="w-full h-[36px] bg-white border border-chat-border text-chat-muted text-[13px] rounded-lg hover:bg-chat-surface transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
