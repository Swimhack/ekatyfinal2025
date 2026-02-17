import { prisma } from '@/lib/prisma'

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  EMAIL_HOURLY: 50,
  EMAIL_DAILY: 200,
}

export async function checkRateLimit(
  userId: string,
  limit: number,
  windowSeconds: number
): Promise<{
  allowed: boolean
  remaining: number
  resetAt: Date
  current: number
}> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowSeconds * 1000)

  try {
    const campaigns = await prisma.outreachCampaign.findMany({
      where: { createdBy: userId },
      select: { id: true }
    })

    const campaignIds = campaigns.map(c => c.id)

    if (campaignIds.length === 0) {
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(now.getTime() + windowSeconds * 1000),
        current: 0,
      }
    }

    const currentCount = await prisma.outreachEmail.count({
      where: {
        campaignId: { in: campaignIds },
        sentAt: { gte: windowStart }
      }
    })

    const remaining = Math.max(0, limit - currentCount)
    const allowed = currentCount < limit

    return {
      allowed,
      remaining,
      resetAt: new Date(now.getTime() + windowSeconds * 1000),
      current: currentCount,
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    return {
      allowed: true,
      remaining: limit,
      resetAt: new Date(now.getTime() + windowSeconds * 1000),
      current: 0,
    }
  }
}

export async function checkEmailRateLimit(userId: string) {
  const hourly = await checkRateLimit(userId, RATE_LIMITS.EMAIL_HOURLY, 3600)
  const daily = await checkRateLimit(userId, RATE_LIMITS.EMAIL_DAILY, 86400)

  const allowed = hourly.allowed && daily.allowed

  let message: string | undefined
  if (!allowed) {
    if (!hourly.allowed) {
      message = `Hourly rate limit exceeded. ${hourly.current}/${RATE_LIMITS.EMAIL_HOURLY} emails sent.`
    } else if (!daily.allowed) {
      message = `Daily rate limit exceeded. ${daily.current}/${RATE_LIMITS.EMAIL_DAILY} emails sent.`
    }
  }

  return { allowed, hourly, daily, message }
}

export async function estimateSendTime(userId: string, emailCount: number) {
  const rateLimitStatus = await checkEmailRateLimit(userId)

  if (rateLimitStatus.allowed) {
    const canSendNow = Math.min(emailCount, rateLimitStatus.hourly.remaining)
    const estimatedSeconds = emailCount * 2
    return {
      estimatedCompletionAt: new Date(Date.now() + estimatedSeconds * 1000),
      canSendNow,
      mustWaitUntil: null,
    }
  }

  const mustWaitUntil = rateLimitStatus.hourly.allowed
    ? rateLimitStatus.daily.resetAt
    : rateLimitStatus.hourly.resetAt

  return {
    estimatedCompletionAt: mustWaitUntil,
    canSendNow: 0,
    mustWaitUntil,
  }
}
