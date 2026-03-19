// src/components/Avatar.tsx
import { getAvatarColor, getInitials } from '../utils/avatarColor'

interface AvatarProps {
  username: string
  avatarUrl?: string
  size?: number
  className?: string
}

export function Avatar({ username, avatarUrl, size = 36, className = '' }: AvatarProps) {
  const bg = getAvatarColor(username)
  const initials = getInitials(username)
  const fontSize = Math.round(size * 0.36)

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        style={{ width: size, height: size, fontSize }}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size, background: bg, fontSize, minWidth: size }}
      className={`rounded-full flex items-center justify-center font-bold text-[#1A1A1A] flex-shrink-0 ${className}`}
      aria-label={username}
    >
      {initials}
    </div>
  )
}
