import { Suspense } from 'react'
import SubscriptionSuccessContent from './SubscriptionSuccessContent'

export const dynamic = 'force-dynamic'

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Processing your subscription...</div>
        </div>
      </div>
    }>
      <SubscriptionSuccessContent />
    </Suspense>
  )
}
