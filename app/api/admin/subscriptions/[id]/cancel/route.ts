import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import Stripe from 'stripe'

const getStripe = () => {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24.acacia'
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const session = await getServerSession()
    if (!session?.user || !['ADMIN', 'EDITOR'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscriptionId = params.id

    // Find subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId }
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Cancel in Stripe
    await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    })

    // Update in database
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the billing period'
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
