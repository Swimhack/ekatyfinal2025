import { AuthForms } from '@/components/auth/AuthForms'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sign In - eKaty',
  description: 'Sign in to your eKaty account to save favorites and access personalized features.',
}

export default function AuthPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome to eKaty
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to save your favorite restaurants and access personalized features
          </p>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <AuthForms />
        </Suspense>
      </div>
    </div>
  )
}