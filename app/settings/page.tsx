'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { parseJsonResponse } from '@/lib/utils/api-response'

const MAX_PROFILE_IMAGE_SIZE = 2 * 1024 * 1024

interface UserProfile {
  id: string
  email: string
  name: string | null
  profileImageUrl: string | null
  role: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const parsed = await parseJsonResponse<{ user: UserProfile }>(response, 'Failed to fetch profile')
      if (!parsed.ok || !parsed.data) {
        if (parsed.status === 401) {
          router.push('/auth/signin?redirect=/settings')
          return
        }
        throw new Error(parsed.error || 'Failed to fetch profile')
      }
      setUser(parsed.data.user)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (2MB) before the request so large files fail fast
    // instead of being rejected mid-upload by the proxy.
    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      setError(`Image is ${(file.size / 1024 / 1024).toFixed(1)}MB — profile images must be less than 2MB`)
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/user/profile-image', {
        method: 'POST',
        body: formData
      })

      const parsed = await parseJsonResponse<{ url?: string }>(response, 'Upload failed')

      if (!parsed.ok || !parsed.data?.url) {
        console.error('Profile image upload failed:', parsed.status, parsed.rawBody)
        throw new Error(parsed.error || 'Upload failed: server returned no image URL')
      }

      setSuccess('Profile image updated successfully!')

      // Update local user state
      setUser(prev => prev ? { ...prev, profileImageUrl: parsed.data!.url ?? null } : null)

      // Refresh the profile
      setTimeout(() => fetchUserProfile(), 1000)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    if (!confirm('Remove your profile image?')) return

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/user/profile-image', {
        method: 'DELETE'
      })

      const parsed = await parseJsonResponse(response, 'Failed to remove image')

      if (!parsed.ok) {
        throw new Error(parsed.error || 'Failed to remove image')
      }

      setSuccess('Profile image removed')
      setUser(prev => prev ? { ...prev, profileImageUrl: null } : null)
    } catch (err) {
      console.error('Remove error:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove image')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4 flex items-center justify-center">
        <div className="text-lg">Please sign in</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6">Profile Image</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-4">
              {success}
            </div>
          )}

          <div className="flex items-start gap-8">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.name || user.email}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-4xl font-bold text-orange-600">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2">{user.name || 'User'}</h3>
              <p className="text-gray-600 mb-4">{user.email}</p>

              <div className="space-y-3">
                <label className="block">
                  <span className="sr-only">Choose profile photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-orange-50 file:text-orange-700
                      hover:file:bg-orange-100
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </label>

                {user.profileImageUrl && (
                  <button
                    onClick={handleRemoveImage}
                    disabled={uploading}
                    className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                  >
                    Remove photo
                  </button>
                )}

                <p className="text-sm text-gray-500">
                  JPG, PNG or GIF. Max size 2MB.
                </p>

                {uploading && (
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Account Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="text-gray-900">{user.email}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <div className="text-gray-900">{user.name || 'Not set'}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <div className="text-gray-900 capitalize">{user.role.toLowerCase()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
