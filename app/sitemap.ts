import { MetadataRoute } from 'next'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ekaty.fly.dev'
  
  // Fetch restaurants from API instead of direct DB access
  let restaurants: any[] = []
  try {
    const response = await fetch(`${baseUrl}/api/restaurants?limit=1000`, {
      next: { revalidate: 3600 }
    })
    const data = await response.json()
    restaurants = data.restaurants || []
  } catch (error) {
    console.error('Error fetching restaurants for sitemap:', error)
  }

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/discover`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/spinner`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/advertise`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/favorites`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
  ]

  // Category pages
  const categories = ['Mexican', 'BBQ', 'Asian', 'American', 'Seafood', 'Indian', 'Greek', 'Breakfast', 'Italian', 'Chinese', 'Japanese', 'Thai', 'Vietnamese']
  const categoryPages = categories.map(cat => ({
    url: `${baseUrl}/discover?category=${encodeURIComponent(cat)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Restaurant pages
  const restaurantPages = restaurants.map((restaurant: any) => ({
    url: `${baseUrl}/restaurants/${restaurant.slug || restaurant.id}`,
    lastModified: restaurant.updatedAt ? new Date(restaurant.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Blog articles
  let blogArticles: any[] = []
  try {
    const blogResponse = await fetch(`${baseUrl}/api/blog?limit=100`, {
      next: { revalidate: 3600 }
    })
    const blogData = await blogResponse.json()
    blogArticles = blogData.articles || []
  } catch (error) {
    console.error('Error fetching blog articles for sitemap:', error)
  }

  const blogPages = [
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    ...blogArticles.map((article: any) => ({
      url: `${baseUrl}/blog/${article.slug}`,
      lastModified: article.updatedAt ? new Date(article.updatedAt) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]

  return [...staticPages, ...categoryPages, ...restaurantPages, ...blogPages]
}
