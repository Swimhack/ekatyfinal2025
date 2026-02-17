import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import Stripe from 'stripe'

const getStripe = () => {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24.acacia'
  })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { priceId, billingCycle } = await request.json()

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 })
    }

    // Create Stripe customer
    const customer = await getStripe().customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: {
        userId: user.id
      }
    })
    const customerId = customer.id

    // Update user with Stripe customer ID
    // TODO: Add stripeCustomerId field to User model
    // await prisma.user.update({
    //   where: { id: user.id },
    //   data: { stripeCustomerId: customerId }
    // })

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/owner/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      metadata: {
        userId: user.id,
        billingCycle
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId: user.id
        }
      }
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
