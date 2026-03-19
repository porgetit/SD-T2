// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginView } from './views/LoginView'
import { RegisterView } from './views/RegisterView'
import { ChatView } from './views/ChatView'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useWebSocket } from './hooks/useWebSocket'

// Componente Wrapper para iniciar hooks globales en contexto React
function AppContainer() {
  useWebSocket()
  
  return (
    <Routes>
      <Route path="/login" element={<LoginView />} />
      <Route path="/register" element={<RegisterView />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ChatView />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContainer />
    </BrowserRouter>
  )
}
