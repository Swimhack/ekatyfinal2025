'use client'

import { LanguageProvider } from '@/contexts/LanguageContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { GamificationProvider } from '@/contexts/GamificationContext'
import { AuthProvider } from '@/lib/auth-context'
import { ReactNode } from 'react'

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <LanguageProvider>
          <GamificationProvider>
            {children}
          </GamificationProvider>
        </LanguageProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
