import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processWebhook } from '@/lib/email/tracking'

/**
 * Webhook endpoint for Resend email events
 * Handles: email.opened, email.clicked, email.bounced, email.complained, email.unsubscribed
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Process the webhook event
    const event = processWebhook(body)

    // Find the email record by searching metadata for the provider email ID
    const email = await prisma.outreachEmail.findFirst({
      where: {
        metadata: { contains: event.emailProviderId || '' }
      },
      select: { id: true, leadId: true, campaignId: true }
    })

    if (!email) {
      console.warn('Email record not found for provider ID:', event.emailProviderId)
      return NextResponse.json({ success: false, error: 'Email not found' }, { status: 404 })
    }

    // Update email record based on event type
    const updates: Record<string, any> = {}

    switch (event.type) {
      case 'opened':
        updates.openedAt = event.timestamp
        break
      case 'clicked':
        updates.clickedAt = event.timestamp
        break
      case 'bounced':
        updates.bouncedAt = event.timestamp
        updates.bounceReason = event.rawEvent.data.reason || 'Unknown'
        break
      case 'unsubscribed':
        // No unsubscribedAt field in schema, log only
        console.log('Unsubscribe event for email:', email.id)
        return NextResponse.json({ success: true })
      default:
        // For other events (sent, delivered, complained), just log
        console.log('Received email event:', event.type, email.id)
        return NextResponse.json({ success: true })
    }

    // Update the email record
    await prisma.outreachEmail.update({
      where: { id: email.id },
      data: updates
    })

    console.log(`Email ${event.type} event processed for email ID:`, email.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
