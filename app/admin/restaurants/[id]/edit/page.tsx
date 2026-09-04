'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { parseJsonResponse } from '@/lib/utils/api-response'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export default function EditRestaurantPage() {
  const params = useParams()
  const router = useRouter()
  const restaurantId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restaurant, setRestaurant] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    zipCode: '',
    phone: '',
    website: '',
    email: '',
    categories: '',
    cuisineTypes: '',
    priceLevel: 'MODERATE',
    featured: false,
    verified: false,
    active: true,
    logoUrl: '',
    heroImage: '',
    photos: ''
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [heroImagePreview, setHeroImagePreview] = useState<string>('')
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([])

  useEffect(() => {
    fetchRestaurant()
  }, [restaurantId])

  const fetchRestaurant = async () => {
    try {
      const response = await fetch(`/api/admin/restaurants/${restaurantId}`)
      const parsed = await parseJsonResponse<any>(response, 'Failed to load restaurant')
      if (parsed.ok && parsed.data) {
        const data = parsed.data
        console.log('Loaded restaurant data, heroImage:', data.heroImage)
        setRestaurant(data)
        setFormData({
          name: data.name || '',
          description: data.description || '',
          address: data.address || '',
          zipCode: data.zipCode || '',
          phone: data.phone || '',
          website: data.website || '',
          email: data.email || '',
          categories: data.categories || '',
          cuisineTypes: data.cuisineTypes || '',
          priceLevel: data.priceLevel || 'MODERATE',
          featured: data.featured || false,
          verified: data.verified || false,
          active: data.active !== false,
          logoUrl: data.logoUrl || '',
          heroImage: data.heroImage || '',
          photos: data.photos || ''
        })
        setLogoPreview(data.logoUrl || '')
        setHeroImagePreview(data.heroImage || '')
        console.log('Set hero image preview to:', data.heroImage)
        if (data.photos) {
          const photosArray = data.photos.split(',').filter(Boolean)
          setPhotosPreviews(photosArray)
        }
      } else {
        console.error('Error loading restaurant:', parsed.status, parsed.error)
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error)
    } finally {
      setLoading(false)
    }
  }

  const uploadImage = async (file: File, type: 'logo' | 'hero' | 'photo'): Promise<string> => {
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB — images must be under 5MB.`)
    }

    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('type', type)

    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      body: uploadFormData
    })

    const parsed = await parseJsonResponse<{ url?: string }>(response, `Failed to upload ${type} image`)

    if (!parsed.ok) {
      throw new Error(parsed.error || `Failed to upload ${type} image`)
    }

    if (!parsed.data?.url) {
      throw new Error(`Upload of ${type} image succeeded but the server returned no image URL.`)
    }

    return parsed.data.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Upload images first if any
      let uploadedLogoUrl = formData.logoUrl
      let uploadedHeroImage = formData.heroImage
      let uploadedPhotos = formData.photos

      try {
        if (logoFile) {
          uploadedLogoUrl = await uploadImage(logoFile, 'logo')
        }

        if (heroImageFile) {
          console.log('Uploading hero image file:', heroImageFile.name)
          uploadedHeroImage = await uploadImage(heroImageFile, 'hero')
          console.log('Hero image uploaded successfully to:', uploadedHeroImage)
        } else {
          console.log('No hero image file to upload, using existing:', uploadedHeroImage)
        }

        if (photoFiles.length > 0) {
          const photoUrls: string[] = []
          for (const file of photoFiles) {
            photoUrls.push(await uploadImage(file, 'photo'))
          }

          // Combine with existing photos
          const existingPhotos = formData.photos ? formData.photos.split(',').filter(Boolean) : []
          uploadedPhotos = [...existingPhotos, ...photoUrls].join(',')
        }
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError)
        const message = uploadError instanceof Error ? uploadError.message : 'Image upload failed'
        alert(`Upload failed: ${message}\n\nNothing was saved. Fix the issue above and try again.`)
        setSaving(false)
        return
      }

      const updateData = {
        ...formData,
        logoUrl: uploadedLogoUrl,
        heroImage: uploadedHeroImage,
        photos: uploadedPhotos
      }
      
      console.log('Sending update with heroImage:', updateData.heroImage)
      
      const response = await fetch(`/api/admin/restaurants/${restaurantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      const parsedUpdate = await parseJsonResponse<any>(response, 'Failed to update restaurant')

      if (parsedUpdate.ok) {
        console.log('Update response:', parsedUpdate.data)

        // Verify the hero image was actually saved
        const verifyResponse = await fetch(`/api/admin/restaurants/${restaurantId}`)
        const parsedVerify = await parseJsonResponse<any>(verifyResponse, 'Failed to verify restaurant')
        if (parsedVerify.ok && parsedVerify.data) {
          const verifiedData = parsedVerify.data
          console.log('Verified hero image after save:', verifiedData.heroImage)
          console.log('Expected hero image:', updateData.heroImage)

          // Only show warning if we expected to save a hero image but it's not there
          if (updateData.heroImage && updateData.heroImage.trim() !== '' && !verifiedData.heroImage) {
            alert('⚠️ Warning: Restaurant updated but hero image was NOT saved correctly.\n\nThe hero image upload may have failed. Please try uploading the hero image again.')
          } else if (heroImageFile && updateData.heroImage === verifiedData.heroImage) {
            alert('✅ Success! Restaurant and hero image updated successfully!')
          } else {
            alert('✅ Restaurant updated successfully!')
          }
        } else {
          alert('✅ Restaurant updated successfully!')
        }
        
        // Force reload to clear cache
        window.location.href = `/restaurants/${restaurant.slug}`
      } else {
        console.error('Restaurant update failed:', parsedUpdate.status, parsedUpdate.rawBody)
        alert(`Error: ${parsedUpdate.error || 'Failed to update restaurant'}`)
      }
    } catch (error) {
      console.error('Error updating restaurant:', error)
      const message = error instanceof Error ? error.message : 'Failed to update restaurant'
      alert(`Failed to update restaurant: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setHeroImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setHeroImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      console.log('Hero image file selected:', file.name)
    }
  }

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPhotoFiles(prev => [...prev, ...files])
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotosPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotosPreviews(prev => prev.filter((_, i) => i !== index))
    setPhotoFiles(prev => prev.filter((_, i) => i !== index))
    
    // Also update formData if it's an existing photo
    const photosArray = formData.photos.split(',').filter(Boolean)
    if (index < photosArray.length) {
      photosArray.splice(index, 1)
      setFormData(prev => ({ ...prev, photos: photosArray.join(',') }))
    }
  }

  const movePhotoUp = (index: number) => {
    if (index === 0) return
    
    setPhotosPreviews(prev => {
      const newPreviews = [...prev]
      ;[newPreviews[index - 1], newPreviews[index]] = [newPreviews[index], newPreviews[index - 1]]
      return newPreviews
    })
    
    const photosArray = formData.photos.split(',').filter(Boolean)
    if (index < photosArray.length) {
      ;[photosArray[index - 1], photosArray[index]] = [photosArray[index], photosArray[index - 1]]
      setFormData(prev => ({ ...prev, photos: photosArray.join(',') }))
    }
  }

  const movePhotoDown = (index: number) => {
    if (index === photosPreviews.length - 1) return
    
    setPhotosPreviews(prev => {
      const newPreviews = [...prev]
      ;[newPreviews[index], newPreviews[index + 1]] = [newPreviews[index + 1], newPreviews[index]]
      return newPreviews
    })
    
    const photosArray = formData.photos.split(',').filter(Boolean)
    if (index < photosArray.length && index + 1 < photosArray.length) {
      ;[photosArray[index], photosArray[index + 1]] = [photosArray[index + 1], photosArray[index]]
      setFormData(prev => ({ ...prev, photos: photosArray.join(',') }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading restaurant...</p>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Restaurant Not Found</h2>
          <Link href="/admin/restaurants" className="btn-primary">
            Back to Restaurants
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/restaurants/${restaurant.slug}`}
            className="text-primary-600 hover:text-primary-700 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Restaurant
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Restaurant</h1>
          <p className="text-gray-600 mt-2">Update restaurant information</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restaurant Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Contact Information</h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Location</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zip Code *
              </label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Categories & Cuisine */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Categories & Cuisine</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categories (comma-separated)
              </label>
              <input
                type="text"
                name="categories"
                value={formData.categories}
                onChange={handleChange}
                placeholder="e.g., BBQ,Casual,Family"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cuisine Types (comma-separated)
              </label>
              <input
                type="text"
                name="cuisineTypes"
                value={formData.cuisineTypes}
                onChange={handleChange}
                placeholder="e.g., Barbecue,Texas BBQ,Smoked Meats"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Level
              </label>
              <select
                name="priceLevel"
                value={formData.priceLevel}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="BUDGET">Budget ($)</option>
                <option value="MODERATE">Moderate ($$)</option>
                <option value="UPSCALE">Upscale ($$$)</option>
                <option value="PREMIUM">Premium ($$$$)</option>
              </select>
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Images</h2>
            
            {/* Hero Image Upload */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                🎯 Hero Image (Main Banner)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                This large image appears at the top of the restaurant page
              </p>
              {heroImagePreview && (
                <div className="mb-3">
                  <img src={heroImagePreview} alt="Hero image preview" className="w-full h-48 object-cover rounded-lg border" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleHeroImageChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 1920x600px (wide banner format)</p>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Logo
              </label>
              {logoPreview && (
                <div className="mb-3">
                  <img src={logoPreview} alt="Logo preview" className="h-24 w-24 object-cover rounded-lg border" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Upload a square logo (recommended: 400x400px)</p>
            </div>

            {/* Photos Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Photos
              </label>
              <p className="text-sm text-gray-600 mb-2">
                ⭐ The first photo will be displayed as the hero image on the restaurant page
              </p>
              {photosPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {photosPreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img src={preview} alt={`Photo ${index + 1}`} className="h-32 w-full object-cover rounded-lg border" />
                      {index === 0 && (
                        <div className="absolute top-1 left-1 bg-primary-600 text-white px-2 py-1 rounded text-xs font-semibold">
                          Hero Image
                        </div>
                      )}
                      <div className="absolute bottom-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => movePhotoUp(index)}
                            className="bg-blue-600 text-white p-1 rounded"
                            title="Move left"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                        )}
                        {index < photosPreviews.length - 1 && (
                          <button
                            type="button"
                            onClick={() => movePhotoDown(index)}
                            className="bg-blue-600 text-white p-1 rounded"
                            title="Move right"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove photo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotosChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Upload multiple photos (recommended: 1200x800px). First photo will be the hero image.</p>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-2">Status</h2>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="featured"
                  checked={formData.featured}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Featured Restaurant</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="verified"
                  checked={formData.verified}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Verified</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Active (visible on site)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/restaurants/${restaurant.slug}`}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
