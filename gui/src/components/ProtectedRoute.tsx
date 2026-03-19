// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const currentUser = useAppStore((s) => s.currentUser)
  if (!currentUser) return <Navigate to="/login" replace />
  return <>{children}</>
}
