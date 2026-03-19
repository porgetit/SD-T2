// src/types/index.ts

export interface User {
  id: string
  username: string
  avatarUrl?: string
}

export interface Message {
  id: string
  senderId: string
  text: string
  timestamp: Date
}

export interface Chat {
  id: string
  participantIds: string[]
  messages: Message[]
  lastActivity: Date
}

export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'IN_SESSION'

// ── WS event types coming from FastAPI /ws ──────────────────────

export type WsEventType =
  | 'TEXT'
  | 'USER_LIST'
  | 'REQUEST_CHAT'
  | 'ACCEPT_CHAT'
  | 'REJECT_CHAT'
  | 'END_CHAT'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'REGISTER_FAIL'
  | 'AUTH_OK'
  | 'AUTH_FAIL'
  | 'UPDATE_PROFILE'
  | 'CONTACT_ACCEPTED'

export interface WsEvent {
  type: WsEventType
  sender: string
  payload: Record<string, unknown>
}

// ── API response shapes ─────────────────────────────────────────

export interface StateResponse {
  connection: ConnectionState
  nickname: string
  avatar_b64: string
  peer: string
  known_users: string[]
}
