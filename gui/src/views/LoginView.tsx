// src/views/LoginView.tsx
import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export function LoginView() {
  const login = useAppStore((s) => s.login)
  const serverUrl = useAppStore((s) => s.serverUrl)
  const setServerUrl = useAppStore((s) => s.setServerUrl)
  const navigate = useNavigate()

  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!nickname.trim()) { setError('El nombre de usuario es obligatorio.'); return }
    if (!password) { setError('La contraseña es obligatoria.'); return }

    setLoading(true)
    try {
      await login(serverUrl, nickname.trim(), password)
      navigate('/', { replace: true })
    } catch {
      setError('No se pudo conectar. Verifica el servidor y tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex items-center justify-center p-4">
      <div className="bg-white border border-chat-border rounded-2xl p-8 w-full max-w-[400px]">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-chat-yellow rounded-full flex items-center justify-center text-[28px] font-bold text-[#1A1A1A] mb-2">
            C
          </div>
          <span className="text-[20px] font-bold text-[#1A1A1A]">ChatNet</span>
        </div>

        <h1 className="text-[18px] font-medium text-[#1A1A1A] text-center">Iniciar sesión</h1>
        <p className="text-[13px] text-chat-muted text-center mt-1 mb-6">
          Conéctate con tus contactos
        </p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
          {/* Server URL */}
          <div>
            <label htmlFor="login-server" className="text-[11px] text-chat-muted block mb-1">
              Servidor (WebSocket)
            </label>
            <input
              id="login-server"
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full h-11 border border-[#E0E0E0] rounded-lg px-3 text-[14px] text-[#1A1A1A] placeholder-chat-hint outline-none focus:border-chat-muted"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="login-username" className="sr-only">Nombre de usuario</label>
            <input
              id="login-username"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nombre de usuario"
              autoComplete="username"
              className="w-full h-11 border border-[#E0E0E0] rounded-lg px-3 text-[14px] text-[#1A1A1A] placeholder-chat-hint outline-none focus:border-chat-muted"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <label htmlFor="login-password" className="sr-only">Contraseña</label>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              autoComplete="current-password"
              className="w-full h-11 border border-[#E0E0E0] rounded-lg px-3 pr-11 text-[14px] text-[#1A1A1A] placeholder-chat-hint outline-none focus:border-chat-muted"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-chat-muted hover:text-[#1A1A1A] transition-colors"
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/>
                  <circle cx="9" cy="9" r="2.5"/>
                  <line x1="2" y1="2" x2="16" y2="16"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/>
                  <circle cx="9" cy="9" r="2.5"/>
                </svg>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-[13px] text-red-500" role="alert">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-chat-yellow text-[#1A1A1A] text-[14px] font-bold rounded-lg mt-2 hover:bg-yellow-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Conectando…' : 'Entrar'}
          </button>
        </form>

        <p className="text-[13px] text-chat-muted text-center mt-4">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-[#1A1A1A] underline underline-offset-2 font-medium">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  )
}
