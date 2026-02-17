import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const adminError = await requireAdmin(request)
  if (adminError) {
    return adminError
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month'
    const format = searchParams.get('format') || 'json'

    // Validate period
    if (!['month', 'quarter', 'year'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period', details: 'Period must be "month", "quarter", or "year"' },
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

    const data = {
      period,
      total_mrr: totalMrr,
      active_partnerships: activePartnerships.length,
      new_partnerships: newPartnerships,
      churned_partnerships: churnedPartnerships,
      partnerships_by_tier: partnershipsByTier,
    }

    // If CSV format is requested
    if (format === 'csv') {
      const csv = generateRevenueCSV(data)
      const today = new Date().toISOString().split('T')[0]

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="revenue-${period}-${today}.csv"`,
        },
      })
    }

    return NextResponse.json(
      {
        data,
        period,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Revenue API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate CSV from revenue metrics
 */
function generateRevenueCSV(data: any): string {
  const rows: string[] = []

  // Header row
  rows.push('Metric,Value')

  // Summary metrics
  rows.push(`Total MRR,$${data.total_mrr.toFixed(2)}`)
  rows.push(`Active Partnerships,${data.active_partnerships}`)
  rows.push(`New Partnerships,${data.new_partnerships}`)
  rows.push(`Churned Partnerships,${data.churned_partnerships}`)

  // Tier breakdown header
  rows.push('')
  rows.push('Tier Breakdown')
  rows.push('Tier,Partnership Count,Revenue')

  // Tier data
  for (const [tierName, tierData] of Object.entries(data.partnerships_by_tier)) {
    const tier = tierData as any
    rows.push(
      `${escapeCSVField(tierName)},${tier.count},${tier.revenue.toFixed(2)}`
    )
  }

  return rows.join('\n')
}

/**
 * Escape CSV field values
 */
function escapeCSVField(field: any): string {
  if (field === null || field === undefined) {
    return ''
  }

  const str = String(field)

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}
