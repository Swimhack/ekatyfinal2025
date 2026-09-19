'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Send, Save, Mail } from 'lucide-react'
import Link from 'next/link'
import LeadSelector from '@/components/admin/monetization/LeadSelector'
import { replaceTemplateVariables } from '@/lib/utils/template-variables'
import { readJson } from '@/lib/utils/api-response'

interface Campaign {
  id: string
  name: string
  subject_template: string
  body_template: string
  status: string
  tier_showcase?: string
  target_list: string[]
  total_sent: number
  total_opened: number
  total_clicked: number
}

interface Email {
  id: string
  lead_id: string
  subject: string
  sent_at: string
  opened_at?: string
  clicked_at?: string
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.campaignId as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [editMode, setEditMode] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [showLeadSelector, setShowLeadSelector] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    subject_template: '',
    body_template: '',
  })

  useEffect(() => {
    fetchCampaign()
  }, [campaignId])

  const fetchCampaign = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/outreach/${campaignId}`)
      const data = await readJson(response)

      if (response.ok) {
        setCampaign(data.campaign)
        setEmails(data.emails || [])
        setFormData({
          name: data.campaign.name,
          subject_template: data.campaign.subject_template,
          body_template: data.campaign.body_template,
        })
      } else {
        setError(data.error || 'Failed to fetch campaign')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setError(null)
    setSuccessMessage(null)
    setSaving(true)

    try {
      const response = await fetch(`/api/admin/outreach/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await readJson(response)

      if (response.ok) {
        setCampaign(data.campaign)
        setEditMode(false)
        setSuccessMessage('Campaign updated successfully')
      } else {
        setError(data.error || 'Failed to update campaign')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const handleSendEmails = async () => {
    if (selectedLeads.length === 0) {
      setError('Please select at least one lead')
      return
    }

    setError(null)
    setSuccessMessage(null)
    setSending(true)

    try {
      const response = await fetch('/api/admin/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          leadIds: selectedLeads,
          tierId: campaign?.tier_showcase,
        }),
      })

      const data = await readJson(response)

      if (response.ok) {
        setSuccessMessage(
          `${data.successCount} emails sent successfully, ${data.failureCount} failed`
        )
        setSelectedLeads([])
        setShowLeadSelector(false)
        // Refresh campaign data
        fetchCampaign()
      } else {
        if (response.status === 429) {
          setError(
            `Rate limit exceeded: ${data.details}. Please try again later.`
          )
        } else {
          setError(data.error || 'Failed to send emails')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaign...</p>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-600 mb-4">Campaign not found</p>
          <Link
            href="/admin/monetization/outreach"
            className="btn-primary inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Campaigns
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/monetization/outreach"
          className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Campaigns
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {campaign.name}
            </h1>
            <p className="text-gray-600 mt-2">Campaign ID: {campaign.id}</p>
          </div>
          <div className="flex gap-3">
            {editMode ? (
              <>
                <button
                  onClick={() => {
                    setEditMode(false)
                    setFormData({
                      name: campaign.name,
                      subject_template: campaign.subject_template,
                      body_template: campaign.body_template,
                    })
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Edit Campaign
                </button>
                <button
                  onClick={() => setShowLeadSelector(!showLeadSelector)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send Emails
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
          {successMessage}
        </div>
      )}

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Total Sent</p>
          <p className="text-3xl font-bold text-gray-900">
            {campaign.total_sent || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Opened</p>
          <p className="text-3xl font-bold text-gray-900">
            {campaign.total_opened || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {campaign.total_sent > 0
              ? `${Math.round(
                  ((campaign.total_opened || 0) / campaign.total_sent) * 100
                )}% open rate`
              : '0% open rate'}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Clicked</p>
          <p className="text-3xl font-bold text-gray-900">
            {campaign.total_clicked || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {campaign.total_sent > 0
              ? `${Math.round(
                  ((campaign.total_clicked || 0) / campaign.total_sent) * 100
                )}% click rate`
              : '0% click rate'}
          </p>
        </div>
      </div>

      {/* Lead Selector */}
      {showLeadSelector && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Select Leads to Email
          </h2>
          <LeadSelector
            selectedLeads={selectedLeads}
            onSelectionChange={setSelectedLeads}
          />
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowLeadSelector(false)}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSendEmails}
              disabled={sending || selectedLeads.length === 0}
              className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
              {sending
                ? 'Sending...'
                : `Send to ${selectedLeads.length} Lead${
                    selectedLeads.length !== 1 ? 's' : ''
                  }`}
            </button>
          </div>
        </div>
      )}

      {/* Campaign Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Email Template
        </h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name
            </label>
            {editMode ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{campaign.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Line Template
            </label>
            {editMode ? (
              <input
                type="text"
                value={formData.subject_template}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    subject_template: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="Use {{restaurant_name}}, {{contact_name}}, etc."
              />
            ) : (
              <p className="text-gray-900 font-mono text-sm bg-gray-50 p-3 rounded">
                {campaign.subject_template}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Available variables: {`{{restaurant_name}}, {{contact_name}}, {{cuisine}}, {{city}}, {{tier_name}}, {{tier_price}}`}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Body Template
            </label>
            {editMode ? (
              <textarea
                value={formData.body_template}
                onChange={(e) =>
                  setFormData({ ...formData, body_template: e.target.value })
                }
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono text-sm"
                placeholder="Use {{restaurant_name}}, {{contact_name}}, etc."
              />
            ) : (
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <pre className="whitespace-pre-wrap text-sm font-mono text-gray-900">
                  {campaign.body_template}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sent Emails History */}
      {emails.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Sent Emails ({emails.length})
          </h2>
          <div className="space-y-4">
            {emails.slice(0, 10).map((email) => (
              <div
                key={email.id}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{email.subject}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Sent: {new Date(email.sent_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {email.opened_at && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Opened
                    </span>
                  )}
                  {email.clicked_at && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      Clicked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
