'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { readJson } from '@/lib/utils/api-response'

export default function NewCampaignPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    subject_template:
      'Partnership Opportunity for {{restaurant_name}} in {{city}}',
    body_template:
      'Dear {{contact_name}},\n\n' +
      "I hope this email finds you well. My name is [Your Name], and I'm reaching out from eKaty - the premier local restaurant discovery platform serving Katy, Texas.\n\n" +
      "We've been following {{restaurant_name}}, and we're impressed by your {{cuisine}} offerings. We believe your restaurant would be an excellent fit for our platform, which helps thousands of local food enthusiasts discover great dining experiences every month.\n\n" +
      "We're currently offering partnership opportunities through our {{tier_name}} tier at just ${{tier_price}}/month. This includes:\n\n" +
      '• Featured placement in search results\n' +
      '• Enhanced listing with photos and menus\n' +
      '• Priority ranking in your cuisine category\n' +
      '• Monthly performance analytics\n' +
      '• Social media promotion\n\n' +
      "We'd love to discuss how we can help {{restaurant_name}} reach more customers in {{city}} and beyond.\n\n" +
      'Would you be available for a brief call this week to explore this opportunity?\n\n' +
      'Best regards,\n' +
      '[Your Name]\n' +
      'eKaty Partnership Team',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      const response = await fetch('/api/admin/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'draft',
        }),
      })

      const data = await readJson(response)

      if (response.ok) {
        // Redirect to campaign detail page
        router.push(`/admin/monetization/outreach/${data.campaign.id}`)
      } else {
        setError(data.error || 'Failed to create campaign')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/monetization/outreach"
            className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Campaigns
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Create New Campaign
          </h1>
          <p className="text-gray-600 mt-2">
            Design an email campaign to reach out to potential restaurant
            partners
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Campaign Details
            </h2>

            <div className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Campaign Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Q1 2025 Restaurant Outreach"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Internal name to identify this campaign
                </p>
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Subject Template *
                </label>
                <input
                  type="text"
                  id="subject"
                  required
                  value={formData.subject_template}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      subject_template: e.target.value,
                    })
                  }
                  placeholder="Use template variables like {{restaurant_name}}"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be personalized for each recipient
                </p>
              </div>

              <div>
                <label
                  htmlFor="body"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Body Template *
                </label>
                <textarea
                  id="body"
                  required
                  rows={16}
                  value={formData.body_template}
                  onChange={(e) =>
                    setFormData({ ...formData, body_template: e.target.value })
                  }
                  placeholder="Write your email template using variables..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-sm"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  💡 Template Variables
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  Use these variables in your subject and body to personalize
                  each email:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white rounded px-3 py-2">
                    <code className="text-brand-600">
                      {`{{restaurant_name}}`}
                    </code>
                    <p className="text-xs text-gray-600 mt-1">
                      Business name
                    </p>
                  </div>
                  <div className="bg-white rounded px-3 py-2">
                    <code className="text-brand-600">
                      {`{{contact_name}}`}
                    </code>
                    <p className="text-xs text-gray-600 mt-1">Contact person</p>
                  </div>
                  <div className="bg-white rounded px-3 py-2">
                    <code className="text-brand-600">
                      {`{{cuisine}}`}
                    </code>
                    <p className="text-xs text-gray-600 mt-1">Cuisine type</p>
                  </div>
                  <div className="bg-white rounded px-3 py-2">
                    <code className="text-brand-600">
                      {`{{city}}`}
                    </code>
                    <p className="text-xs text-gray-600 mt-1">City location</p>
                  </div>
                  <div className="bg-white rounded px-3 py-2">
                    <code className="text-brand-600">
                      {`{{tier_name}}`}
                    </code>
                    <p className="text-xs text-gray-600 mt-1">
                      Partnership tier
                    </p>
                  </div>
                  <div className="bg-white rounded px-3 py-2">
                    <code className="text-brand-600">
                      {`{{tier_price}}`}
                    </code>
                    <p className="text-xs text-gray-600 mt-1">Monthly price</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href="/admin/monetization/outreach"
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
