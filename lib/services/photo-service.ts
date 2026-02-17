// Photo storage not available - upload/delete methods are stubs

export interface PhotoUploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface RestaurantPhoto {
  id: string
  url: string
  alt: string
  caption?: string
  isPrimary?: boolean
}

export class PhotoService {
  private static instance: PhotoService
  
  private constructor() {}
  
  static getInstance(): PhotoService {
    if (!PhotoService.instance) {
      PhotoService.instance = new PhotoService()
    }
    return PhotoService.instance
  }

  /**
   * Get the primary photo for a restaurant
   */
  getPrimaryPhoto(photos: string[]): string | null {
    return photos && photos.length > 0 ? photos[0] : null
  }

  /**
   * Get fallback photo if restaurant has no photos
   */
  getFallbackPhoto(): string {
    return 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80' // Generic restaurant interior
  }

  /**
   * Get display photo for a restaurant (primary or fallback)
   */
  getDisplayPhoto(photos: string[]): string {
    const primary = this.getPrimaryPhoto(photos)
    return primary || this.getFallbackPhoto()
  }

  /**
   * Build optimized image URL with parameters
   */
  getOptimizedUrl(url: string, options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'jpg' | 'png'
  } = {}): string {
    if (!url) return this.getFallbackPhoto()
    
    // If it's an Unsplash URL, use their parameters
    if (url.includes('unsplash.com')) {
      const params = new URLSearchParams()
      if (options.width) params.set('w', options.width.toString())
      if (options.height) params.set('h', options.height.toString())
      if (options.quality) params.set('q', options.quality.toString())
      if (options.format && options.format !== 'jpg') params.set('fm', options.format)
      
      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}${params.toString()}`
    }
    
    return url
  }

  /**
   * Upload photo to Supabase Storage
   */
  async uploadPhoto(file: File, restaurantId: string): Promise<PhotoUploadResult> {
    return { success: false, error: 'Photo upload not configured' }
  }

  /**
   * Delete photo from Supabase Storage
   */
  async deletePhoto(path: string): Promise<boolean> {
    return false
  }

  /**
   * Generate image blur placeholder for loading states
   */
  getBlurPlaceholder(): string {
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=='
  }

  /**
   * Validate image URL
   */
  async validateImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      return response.ok && response.headers.get('content-type')?.startsWith('image/') === true
    } catch {
      return false
    }
  }

  /**
   * Format restaurant photos for display with metadata
   */
  formatPhotosForDisplay(photos: string[], restaurantName: string): RestaurantPhoto[] {
    return photos.map((url, index) => ({
      id: `${restaurantName}-${index}`,
      url,
      alt: `${restaurantName} photo ${index + 1}`,
      caption: index === 0 ? `${restaurantName}` : undefined,
      isPrimary: index === 0
    }))
  }
}

// Export singleton instance
export const photoService = PhotoService.getInstance()

// Export utility functions for easier use
export const getDisplayPhoto = (photos: string[]) => photoService.getDisplayPhoto(photos)
export const getOptimizedUrl = (url: string, options?: Parameters<typeof photoService.getOptimizedUrl>[1]) => 
  photoService.getOptimizedUrl(url, options)