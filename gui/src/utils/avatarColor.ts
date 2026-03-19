// src/utils/avatarColor.ts

const AVATAR_COLORS = [
  '#D0E8FF', // blue
  '#C8F0D8', // green
  '#FFD8CC', // coral
  '#E0D0FF', // purple
  '#FFF3CC', // yellow
  '#FFDCE8', // pink
]

/**
 * Deterministically picks an avatar background color from a username string.
 */
export function getAvatarColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/**
 * Returns up to 2 uppercase initials from a username.
 */
export function getInitials(username: string): string {
  const parts = username.trim().split(/[\s_-]+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}
