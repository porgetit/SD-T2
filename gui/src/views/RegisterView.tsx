// src/views/RegisterView.tsx
import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export function RegisterView() {
  const register = useAppStore((s) => s.register)
  const serverUrl = useAppStore((s) => s.serverUrl)
  const setServerUrl = useAppStore((s) => s.setServerUrl)
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!username.trim()) errs.username = 'El nombre de usuario es obligatorio.'
    else if (username.trim().length < 3) errs.username = 'Mínimo 3 caracteres.'
    if (!password) errs.password = 'La contraseña es obligatoria.'
    else if (password.length < 6) errs.password = 'Mínimo 6 caracteres.'
    if (password !== confirmPassword) errs.confirm = 'Las contraseñas no coinciden.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      // Llama a register() que envía AUTH_REGISTER y espera AUTH_OK por WS
      await register(serverUrl, username.trim(), password, avatarUrl || undefined)
      navigate('/', { replace: true })
    } catch {
      setErrors({ global: 'No se pudo crear la cuenta. Intenta con otro nombre de usuario.' })
    } finally {
      setLoading(false)
    }
  }


  const EyeIcon = ({ visible }: { visible: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/>
      <circle cx="9" cy="9" r="2.5"/>
      {!visible && <line x1="2" y1="2" x2="16" y2="16"/>}
    </svg>
  )

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

        <h1 className="text-[18px] font-medium text-[#1A1A1A] text-center">Crear cuenta</h1>
        <p className="text-[13px] text-chat-muted text-center mt-1 mb-6">Únete a la red</p>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">

          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Seleccionar foto de perfil"
              className="w-20 h-20 rounded-full bg-[#E8E8E8] flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#AAAAAA" strokeWidth="1.5">
                  <rect x="3" y="8" width="22" height="17" rx="3"/>
                  <circle cx="14" cy="16.5" r="5"/>
                  <path d="M10 8l2-4h4l2 4"/>
                </svg>
              )}
            </button>
            <span className="text-[12px] text-chat-muted">Añadir foto</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Server URL */}
          <div>
            <label htmlFor="reg-server" className="text-[11px] text-chat-muted block mb-1">
              Servidor (WebSocket)
            </label>
            <input
              id="reg-server"
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full h-11 border border-[#E0E0E0] rounded-lg px-3 text-[14px] text-[#1A1A1A] outline-none focus:border-chat-muted"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="reg-username" className="sr-only">Nombre de usuario</label>
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nombre de usuario"
              autoComplete="username"
              className={`w-full h-11 border rounded-lg px-3 text-[14px] text-[#1A1A1A] placeholder-chat-hint outline-none focus:border-chat-muted ${errors.username ? 'border-red-400' : 'border-[#E0E0E0]'}`}
            />
            {errors.username && <p className="text-[12px] text-red-500 mt-1">{errors.username}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="reg-password" className="sr-only">Contraseña</label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete="new-password"
                className={`w-full h-11 border rounded-lg px-3 pr-11 text-[14px] text-[#1A1A1A] placeholder-chat-hint outline-none focus:border-chat-muted ${errors.password ? 'border-red-400' : 'border-[#E0E0E0]'}`}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-chat-muted">
                <EyeIcon visible={showPassword} />
              </button>
            </div>
            {errors.password && <p className="text-[12px] text-red-500 mt-1">{errors.password}</p>}
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="reg-confirm" className="sr-only">Confirmar contraseña</label>
            <div className="relative">
              <input
                id="reg-confirm"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar contraseña"
                autoComplete="new-password"
                className={`w-full h-11 border rounded-lg px-3 pr-11 text-[14px] text-[#1A1A1A] placeholder-chat-hint outline-none focus:border-chat-muted ${errors.confirm ? 'border-red-400' : 'border-[#E0E0E0]'}`}
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-chat-muted">
                <EyeIcon visible={showConfirm} />
              </button>
            </div>
            {errors.confirm && <p className="text-[12px] text-red-500 mt-1">{errors.confirm}</p>}
          </div>

          {errors.global && (
            <p className="text-[13px] text-red-500" role="alert">{errors.global}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-chat-yellow text-[#1A1A1A] text-[14px] font-bold rounded-lg mt-1 hover:bg-yellow-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-[13px] text-chat-muted text-center mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-[#1A1A1A] underline underline-offset-2 font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
