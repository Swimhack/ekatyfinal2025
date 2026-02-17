import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { prisma } from '@/lib/prisma'
import { formatDateForCSV, formatCurrencyForCSV } from '@/lib/utils/export'

/**
 * GET /api/admin/revenue/export
 * Export revenue report as CSV
 */
export async function GET(request: NextRequest) {
  const authResponse = await requireAdmin(request)
  if (authResponse) return authResponse

  try {
    const data = await prisma.partnership.findMany({
      where: { status: 'active' },
      include: {
        restaurant: {
          select: {
            name: true,
          },
        },
        tier: {
          select: {
            name: true,
            monthlyPrice: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform data for CSV export
    const csvData = (data || []).map((partnership) => ({
      'Restaurant Name': partnership.restaurant?.name || 'Unknown',
      Tier: partnership.tier?.name || 'Unknown',
      'Monthly Price': formatCurrencyForCSV(partnership.tier?.monthlyPrice || 0),
      Status: partnership.status,
      'Start Date': formatDateForCSV(partnership.startDate),
      'End Date': formatDateForCSV(partnership.endDate),
      'Billing Cycle': partnership.billingCycle,
    }))

    // Generate CSV content
    const headers = [
      'Restaurant Name',
      'Tier',
      'Monthly Price',
      'Status',
      'Start Date',
      'End Date',
      'Billing Cycle',
    ] as const

    type CSVRow = Record<string, any>

    const escapeCSVValue = (value: any): string => {
      if (value === null || value === undefined) {
        return ''
      }

      const stringValue = String(value)

      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (
        stringValue.includes(',') ||
        stringValue.includes('"') ||
        stringValue.includes('\n')
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }

      return stringValue
    }

    // Generate CSV rows
    const headerRow = headers.join(',')
    const dataRows = csvData.map((row: CSVRow) => {
      return headers.map((header) => escapeCSVValue(row[header])).join(',')
    })

    const csv = [headerRow, ...dataRows].join('\n')

    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0]
    const filename = `revenue-report-${today}.csv`

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/revenue/export:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
