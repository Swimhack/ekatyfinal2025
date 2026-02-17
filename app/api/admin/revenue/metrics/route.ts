import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/prisma'

/**
 * Calculate MRR trend for the last 6 months
 */
async function calculateMRRTrend() {
  const now = new Date()
  const trends = []

  // Calculate MRR for each of the last 6 months
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)

    // Get partnerships that were active during this month
    const partnerships = await prisma.partnership.findMany({
      where: {
        startDate: { lt: nextMonth },
        OR: [
          { status: 'active' },
          { endDate: { gte: targetDate } },
        ],
      },
      include: {
        tier: {
          select: { monthlyPrice: true },
        },
      },
    })

    // Filter partnerships that were actually active in this month
    const activePartnerships = partnerships.filter((p) => {
      const startDate = new Date(p.startDate)
      const endDate = p.endDate ? new Date(p.endDate) : null

      return (
        startDate <= nextMonth &&
        (p.status === 'active' || (endDate && endDate >= targetDate))
      )
    })

    // Calculate MRR for this month
    const monthlyMRR = activePartnerships.reduce((sum: number, p) => {
      return sum + (p.tier?.monthlyPrice || 0)
    }, 0)

    trends.push({
      month: targetDate.toISOString().split('T')[0].substring(0, 7), // YYYY-MM format
      mrr: monthlyMRR,
      partnership_count: activePartnerships.length,
    })
  }

  return trends
}

/**
 * GET /api/admin/revenue/metrics
 * Get revenue metrics with optional period filter
 */
export async function GET(request: NextRequest) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') as 'month' | 'quarter' | 'year') || 'month'

    // Validate period
    if (!['month', 'quarter', 'year'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be: month, quarter, or year' },
        { status: 400 }
      )
    }

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (period === 'quarter') {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3
      startDate = new Date(now.getFullYear(), quarterMonth, 1)
    } else {
      startDate = new Date(now.getFullYear(), 0, 1)
    }

    // Get active partnerships with tier info
    const activePartnerships = await prisma.partnership.findMany({
      where: { status: 'active' },
      include: {
        tier: {
          select: { id: true, name: true, monthlyPrice: true },
        },
      },
    })

    // Get new partnerships in period
    const newPartnerships = await prisma.partnership.count({
      where: {
        startDate: { gte: startDate },
      },
    })

    // Get churned partnerships in period
    const churnedPartnerships = await prisma.partnership.count({
      where: {
        status: { in: ['canceled', 'expired'] },
        updatedAt: { gte: startDate },
      },
    })

    // Calculate MRR
    const totalMrr = activePartnerships.reduce(
      (sum, p) => sum + (p.tier?.monthlyPrice || 0),
      0
    )

    // Partnerships by tier
    const partnershipsByTier: Record<string, { count: number; revenue: number }> = {}
    for (const p of activePartnerships) {
      const tierName = p.tier?.name || 'Unknown'
      if (!partnershipsByTier[tierName]) {
        partnershipsByTier[tierName] = { count: 0, revenue: 0 }
      }
      partnershipsByTier[tierName].count++
      partnershipsByTier[tierName].revenue += p.tier?.monthlyPrice || 0
    }

    // Calculate MRR trend for last 6 months
    const mrrTrend = await calculateMRRTrend()

    return NextResponse.json({
      period,
      total_mrr: totalMrr,
      active_partnerships: activePartnerships.length,
      new_partnerships: newPartnerships,
      churned_partnerships: churnedPartnerships,
      partnerships_by_tier: partnershipsByTier,
      mrr_trend: mrrTrend,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/revenue/metrics:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
