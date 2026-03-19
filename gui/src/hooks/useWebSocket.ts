// src/hooks/useWebSocket.ts
import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { WsEvent } from '../types'

export function useWebSocket() {
  const onWsEvent = useAppStore((s) => s.onWsEvent)
  const setConnectionState = useAppStore((s) => s.setConnectionState)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

    ws.onopen = () => {
      // Connection is already managed by the FastAPI backend;
      // this just means the local WS tunnel is open.
    }

    ws.onmessage = (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as WsEvent
        onWsEvent(event)
      } catch {
        console.warn('[WS] Could not parse event:', e.data)
      }
    }

    ws.onerror = () => {
      console.warn('[WS] Connection error')
    }

    ws.onclose = () => {
      setConnectionState('DISCONNECTED')
    }

    return () => {
      ws.close()
    }
  }, [onWsEvent, setConnectionState])
}
