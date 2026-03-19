// src/api/client.ts
import axios from 'axios'
import type { StateResponse } from '../types'

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000,
})

export const api = {
  register(serverUrl: string, username: string, password: string, avatarUrl?: string) {
    return http.post('/register', {
      server_url: serverUrl,
      username,
      password,
      avatar_b64: avatarUrl ?? '',
    })
  },

  connect(serverUrl: string, nickname: string, password: string) {
    return http.post('/connect', { server_url: serverUrl, nickname, password })
  },

  disconnect() {
    return http.post('/disconnect')
  },

  getState() {
    return http.get<StateResponse>('/state')
  },

  listUsers() {
    return http.get('/users')
  },

  requestChat(target: string) {
    return http.post('/chat/request', { target })
  },

  acceptChat() {
    return http.post('/chat/accept')
  },

  rejectChat() {
    return http.post('/chat/reject')
  },

  endChat() {
    return http.post('/chat/end')
  },

  sendMessage(text: string) {
    return http.post('/message', { text })
  },

  updateAccount(username: string, password?: string, avatarUrl?: string) {
    return http.put('/account', {
      username,
      ...(password  ? { password }    : {}),
      ...(avatarUrl ? { avatar_b64: avatarUrl } : {}),
    })
  },
}
