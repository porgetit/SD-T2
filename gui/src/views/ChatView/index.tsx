// src/views/ChatView/index.tsx
import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { useAppStore } from '../../store/useAppStore'
import { api } from '../../api/client'

export function ChatView() {
  const setConnectionState = useAppStore((s) => s.setConnectionState)

  // On mount: sync state from FastAPI backend
  useEffect(() => {
    api.getState()
      .then(({ data }) => {
        setConnectionState(data.connection)
        // Kick a user list refresh
        return api.listUsers()
      })
      .catch(() => {
        // Backend not reachable — stay with local state
      })
  }, [setConnectionState])

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <Sidebar />
      <ChatArea />
    </div>
  )
}
