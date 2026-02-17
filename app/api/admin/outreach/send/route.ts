import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimit } from '@/lib/utils/rate-limiter'
import { sendEmail } from '@/lib/email/client'
import { replaceTemplateVariables } from '@/lib/utils/template-variables'

interface SendRequest {
  campaignId: string
  leadIds: string[]
  tierId?: string
}

/**
 * POST /api/admin/outreach/send
 * Send outreach emails with rate limiting
 */
export async function POST(request: NextRequest) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const body: SendRequest = await request.json()
    const { campaignId, leadIds, tierId } = body

    // Validation
    if (!campaignId || !leadIds || leadIds.length === 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: 'campaignId and leadIds are required',
        },
        { status: 400 }
      )
    }

    // Get current user
    const user = await getCurrentUser()

    if (!user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - session required' },
        { status: 401 }
      )
    }

    // Check rate limit (50/hour, 200/day)
    const hourlyLimit = await checkRateLimit(user.id, 50, 3600)

    if (!hourlyLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: 'You can send 50 emails per hour. Please try again later.',
          remaining: hourlyLimit.remaining,
          resetAt: hourlyLimit.resetAt,
        },
        { status: 429 }
      )
    }

    const dailyLimit = await checkRateLimit(user.id, 200, 86400)

    if (!dailyLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: 'You can send 200 emails per day. Please try again later.',
          remaining: dailyLimit.remaining,
          resetAt: dailyLimit.resetAt,
        },
        { status: 429 }
      )
    }

    // Fetch campaign details
    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Fetch tier details if provided
    let tier = null
    if (tierId) {
      tier = await prisma.partnershipTier.findUnique({
        where: { id: tierId },
      })
    }

    // Fetch leads
    const leads = await prisma.monetizationLead.findMany({
      where: { id: { in: leadIds } },
    })

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      )
    }

    // Send emails to each lead
    const results = []
    let successCount = 0
    let failureCount = 0

    for (const lead of leads) {
      try {
        // Prepare template variables
        const variables = {
          restaurant_name: lead.restaurantName,
          contact_name: lead.contactName || '',
          cuisine: '',
          city: '',
          tier_name: tier?.name || '',
          tier_price: tier?.monthlyPrice?.toString() || '',
        }

        // Replace template variables in subject
        const subject = replaceTemplateVariables(
          campaign.subject,
          variables,
          false
        )

        // Replace template variables in body
        const emailBody = replaceTemplateVariables(
          campaign.emailTemplate,
          variables,
          false
        )

        // Send email
        const emailResult = await sendEmail({
          to: lead.contactEmail,
          subject,
          html: emailBody.replace(/\n/g, '<br>'),
        })

        // Record email sent
        await prisma.outreachEmail.create({
          data: {
            campaignId,
            leadId: lead.id,
            recipientEmail: lead.contactEmail,
            recipientName: lead.contactName,
            subject,
            emailBody,
            status: 'sent',
            sentAt: new Date(),
          },
        })

        successCount++
        results.push({
          leadId: lead.id,
          email: lead.contactEmail,
          status: 'sent',
        })
      } catch (error) {
        failureCount++
        results.push({
          leadId: lead.id,
          email: lead.contactEmail,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Update campaign stats
    await prisma.outreachCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    })

    return NextResponse.json({
      message: `Sent ${successCount} emails, ${failureCount} failed`,
      successCount,
      failureCount,
      results,
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/outreach/send:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
