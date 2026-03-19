// src/views/ChatView/index.tsx
import { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { ChatArea } from './ChatArea'
import { useWebSocket } from '../../hooks/useWebSocket'
import { useAppStore } from '../../store/useAppStore'
import { api } from '../../api/client'

export function ChatView() {
  // Opens WS tunnel and registers onWsEvent processor
  useWebSocket()

  const setConnectionState = useAppStore((s) => s.setConnectionState)
  const knownUsers = useAppStore((s) => s.knownUsers)

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
