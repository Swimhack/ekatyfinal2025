import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import {
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendSubscriptionCanceledEmail,
  sendSubscriptionChangedEmail
} from '@/lib/email-service'

const getStripe = () => {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-02-24.acacia'
  })
}

const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret())
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId

  if (!userId) {
    console.error('No userId in subscription metadata')
    return
  }

  // Determine subscription tier from price
  const tier = getSubscriptionTier(subscription)
  const status = subscription.status

  // Update or create subscription record
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    update: {
      status,
      tier,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      status,
      tier,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    }
  })

  // Update user's active subscription
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: tier,
      subscriptionStatus: status
    }
  })

  console.log(`Subscription updated for user ${userId}: ${tier} (${status})`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId

  if (!userId) {
    console.error('No userId in subscription metadata')
    return
  }

  // Update subscription status to canceled
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'canceled',
      canceledAt: new Date()
    }
  })

  // Send cancellation email
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.email) {
    const tierName = getTierDisplayName(user.subscriptionTier || 'FREE')
    const cancelDate = new Date().toLocaleDateString()
    const accessEndDate = new Date(subscription.current_period_end * 1000).toLocaleDateString()

    await sendSubscriptionCanceledEmail(
      user.email,
      user.name || 'Restaurant Owner',
      tierName,
      cancelDate,
      accessEndDate
    )
  }

  // Downgrade user to free tier
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: 'FREE',
      subscriptionStatus: 'canceled'
    }
  })

  console.log(`Subscription canceled for user ${userId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const subscription = await getStripe().subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata.userId

  if (!userId) return

  // Create payment record
  await prisma.payment.create({
    data: {
      userId,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent as string,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency.toUpperCase(),
      status: 'succeeded',
      paidAt: new Date(invoice.status_transitions.paid_at! * 1000)
    }
  })

  // Ensure subscription is active
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'active' }
  })

  // Send payment success email
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.email) {
    const tierName = getTierDisplayName(user.subscriptionTier || 'FREE')
    const nextBillingDate = new Date(subscription.current_period_end * 1000).toLocaleDateString()

    await sendPaymentSuccessEmail(
      user.email,
      user.name || 'Restaurant Owner',
      invoice.amount_paid,
      invoice.currency,
      invoice.hosted_invoice_url || `https://ekaty.com/owner/subscription`,
      tierName,
      nextBillingDate
    )
  }

  console.log(`Payment succeeded for user ${userId}: $${invoice.amount_paid / 100}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  const subscription = await getStripe().subscriptions.retrieve(invoice.subscription as string)
  const userId = subscription.metadata.userId

  if (!userId) return

  // Create failed payment record
  await prisma.payment.create({
    data: {
      userId,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent as string || null,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      status: 'failed'
    }
  })

  // Update subscription status
  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: { status: 'past_due' }
  })

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: 'past_due' }
  })

  // Send payment failed email
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.email) {
    const tierName = getTierDisplayName(user.subscriptionTier || 'FREE')
    const retryDate = invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString()
      : 'within 3-5 days'

    await sendPaymentFailedEmail(
      user.email,
      user.name || 'Restaurant Owner',
      invoice.amount_due,
      invoice.currency,
      tierName,
      retryDate,
      `https://ekaty.com/api/stripe/portal`
    )
  }

  console.log(`Payment failed for user ${userId}`)
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId

  if (!userId) {
    console.error('No userId in checkout session metadata')
    return
  }

  // Update user with Stripe customer ID
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: session.customer as string
    }
  })

  console.log(`Checkout completed for user ${userId}`)
}

function getSubscriptionTier(subscription: Stripe.Subscription): string {
  const priceId = subscription.items.data[0]?.price.id

  // Map Stripe price IDs to subscription tiers
  const tierMap: Record<string, string> = {
    'price_basic_monthly': 'BASIC',
    'price_pro_monthly': 'PRO',
    'price_premium_monthly': 'PREMIUM',
    // Add annual price IDs when created
    'price_basic_annual': 'BASIC',
    'price_pro_annual': 'PRO',
    'price_premium_annual': 'PREMIUM'
  }

  return tierMap[priceId] || 'FREE'
}

function getTierDisplayName(tier: string): string {
  const tierNames: Record<string, string> = {
    'FREE': 'Free Plan',
    'BASIC': 'Basic Plan',
    'PRO': 'Pro Plan',
    'PREMIUM': 'Premium Plan'
  }
  return tierNames[tier] || tier
}
