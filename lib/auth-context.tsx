'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { parseJsonResponse } from '@/lib/utils/api-response'

interface AuthUser {
  id: string
  email: string
  user_metadata?: { full_name?: string }
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session via API
    fetch('/api/auth/session')
      .then(res => parseJsonResponse<{ user: AuthUser | null }>(res, 'Failed to read session'))
      .then(parsed => {
        if (!parsed.ok) {
          console.warn('Session check failed:', parsed.status, parsed.error)
        }
        setUser(parsed.data?.user || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    // Real endpoint in this app is /api/auth/login; /api/auth/signin never existed.
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const parsed = await parseJsonResponse<{ user: AuthUser }>(res, 'Sign in failed')
    if (!parsed.ok || !parsed.data) {
      throw new Error(parsed.error || 'Sign in failed')
    }
    setUser(parsed.data.user)
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: fullName }),
    })
    const parsed = await parseJsonResponse<{ user: AuthUser }>(res, 'Sign up failed')
    if (!parsed.ok || !parsed.data) {
      throw new Error(parsed.error || 'Sign up failed')
    }
    setUser(parsed.data.user)
  }

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  const resetPassword = async (email: string) => {
    // This app recovers accounts with an emailed magic link rather than a
    // password-reset token endpoint.
    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const parsed = await parseJsonResponse(res, 'Password reset failed')
    if (!parsed.ok) {
      throw new Error(parsed.error || 'Password reset failed')
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
