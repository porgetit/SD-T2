// src/components/DateSeparator.tsx
import { formatDateSeparator } from '../utils/formatDate'

interface DateSeparatorProps {
  date: Date
}

export function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <div className="flex items-center justify-center my-3">
      <span className="bg-chat-surface border border-chat-border rounded-full px-3 py-1 text-[11px] text-chat-muted select-none">
        {formatDateSeparator(date)}
      </span>
    </div>
  )
}
