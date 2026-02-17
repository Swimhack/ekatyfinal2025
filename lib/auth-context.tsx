'use client'

import { createContext, useContext, useEffect, useState } from 'react'

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
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setUser(data?.user || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Sign in failed')
    }
    const data = await res.json()
    setUser(data.user)
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: fullName }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Sign up failed')
    }
    const data = await res.json()
    setUser(data.user)
  }

  const signOut = async () => {
    await fetch('/api/auth/signout', { method: 'POST' })
    setUser(null)
  }

  const resetPassword = async (email: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Password reset failed')
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
