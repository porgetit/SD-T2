// src/utils/formatDate.ts

/**
 * Returns a human-readable relative timestamp.
 * - Same day      → "14:35"
 * - Yesterday     → "Ayer"
 * - < 7 days      → "3d"
 * - Older         → "12 Mar"
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `${diffDays}d`

  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${date.getDate()} ${months[date.getMonth()]}`
}

/**
 * Returns a date separator label: "Hoy", "Ayer", or "12 de marzo"
 */
export function formatDateSeparator(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) return 'Hoy'
  if (diffDays === 1) return 'Ayer'

  const months = ['enero','febrero','marzo','abril','mayo','junio',
                  'julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${date.getDate()} de ${months[date.getMonth()]}`
}

/**
 * Returns true if two dates fall on different calendar days.
 */
export function isDifferentDay(a: Date, b: Date): boolean {
  return (
    a.getDate() !== b.getDate() ||
    a.getMonth() !== b.getMonth() ||
    a.getFullYear() !== b.getFullYear()
  )
}
