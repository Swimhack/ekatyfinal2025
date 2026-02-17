import { prisma } from '@/lib/prisma'
import { generateExcerpt, estimateReadingTime } from '@/lib/blog/utils'
import Link from 'next/link'

// Make this page dynamic to avoid build-time database access
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Blog - eKaty | Restaurant Discovery in Katy, Texas',
  description: 'Explore expert insights and tips on restaurants, dining, and local business in Katy, Texas from eKaty.',
  openGraph: {
    title: 'Blog - eKaty | Restaurant Discovery in Katy, Texas',
    description: 'Explore expert insights and tips on restaurants, dining, and local business in Katy, Texas from eKaty.',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog - eKaty | Restaurant Discovery in Katy, Texas',
    description: 'Explore expert insights and tips on restaurants, dining, and local business in Katy, Texas from eKaty.',
    images: ['/og-image.jpg'],
  },
}

export default async function BlogPage() {
  let articles: Awaited<ReturnType<typeof prisma.blogArticle.findMany>> = []
  
  try {
    articles = await prisma.blogArticle.findMany({
      where: { status: 'published' },
      orderBy: { publishedDate: 'desc' },
      take: 20
    })
  } catch (error) {
    // If database isn't available, show empty state
    console.error('Error fetching blog articles:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6">
            <span className="text-5xl">👨‍👩‍👧‍👦</span>
          </div>
          <h1 className="text-5xl font-bold mb-4">Family Dining Blog</h1>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto">
            Discover family-friendly restaurants, dining tips, and local food stories from Katy families. 
            Your guide to making great dining memories with your loved ones.
          </p>
        </div>
      </div>
      
      {/* Family-Focused Categories */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap gap-3 justify-center">
            <Link 
              href="/blog?category=family-friendly" 
              className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-200 transition-colors"
            >
              👨‍👩‍👧‍👦 Family-Friendly
            </Link>
            <Link 
              href="/blog?category=kids-menu" 
              className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-200 transition-colors"
            >
              🍕 Kids Menus
            </Link>
            <Link 
              href="/blog?category=date-night" 
              className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-200 transition-colors"
            >
              💑 Date Night Spots
            </Link>
            <Link 
              href="/blog?category=weekend-brunch" 
              className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-200 transition-colors"
            >
              🥞 Weekend Brunch
            </Link>
            <Link 
              href="/blog?category=birthday-parties" 
              className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-200 transition-colors"
            >
              🎉 Birthday Parties
            </Link>
            <Link 
              href="/blog?category=budget-friendly" 
              className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-200 transition-colors"
            >
              💰 Budget-Friendly
            </Link>
          </div>
        </div>
      </div>

      {/* Articles List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {articles.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">No Articles Yet</h2>
            <p className="text-gray-600 text-lg">
              Check back soon for expert insights on restaurants and dining in Katy, Texas!
            </p>
          </div>
        ) : (
          <>
            {/* Featured Article (First One) */}
            {articles.length > 0 && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">⭐</span>
                  <span className="text-sm font-semibold text-primary-600 uppercase tracking-wide">Featured Article</span>
                </div>
                <Link href={`/blog/${articles[0].slug}`}>
                  <article className="group relative bg-gradient-to-br from-primary-50 via-white to-primary-50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-primary-200 hover:border-primary-400">
                    {/* Decorative gradient overlay */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-200 opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover:opacity-20 transition-opacity"></div>
                    
                    <div className="relative p-8 md:p-10">
                      {/* Badge */}
                      <div className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <span>🔥</span>
                        <span>Latest</span>
                      </div>
                      
                      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 group-hover:text-primary-700 transition-colors leading-tight">
                        {articles[0].title}
                      </h2>
                      
                      {articles[0].metaDescription && (
                        <p className="text-lg text-gray-700 mb-6 leading-relaxed font-medium">
                          {articles[0].metaDescription}
                        </p>
                      )}
                      
                      <p className="text-gray-600 mb-6 text-base leading-relaxed">
                        {generateExcerpt(articles[0].content, 250)}...
                      </p>
                      
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          {articles[0].publishedDate && (
                            <span className="flex items-center gap-2">
                              <span className="text-lg">📅</span>
                              <span className="font-medium">
                                {new Date(articles[0].publishedDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </span>
                          )}
                          <span className="flex items-center gap-2">
                            <span className="text-lg">⏱️</span>
                            <span className="font-medium">{estimateReadingTime(articles[0].content)} min read</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="text-lg">👤</span>
                            <span className="font-medium">{articles[0].authorName}</span>
                          </span>
                        </div>
                        
                        <div className="inline-flex items-center gap-2 text-primary-600 font-bold text-lg group-hover:gap-4 transition-all">
                          <span>Read Full Article</span>
                          <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              </div>
            )}
            
            {/* Other Articles Grid */}
            {articles.length > 1 && (
              <>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">More Articles</h2>
                  <span className="text-sm text-gray-500">{articles.length - 1} more {articles.length === 2 ? 'article' : 'articles'}</span>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.slice(1).map((article, index) => {
                    const isNew = article.publishedDate && 
                      new Date(article.publishedDate).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
                    const readingTime = estimateReadingTime(article.content)
                    
                    return (
                      <Link key={article.id} href={`/blog/${article.slug}`}>
                        <article className="group h-full bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-primary-400 hover:-translate-y-1 flex flex-col">
                          {/* Card Header with Badge */}
                          <div className="relative p-6 pb-4">
                            {isNew && (
                              <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg animate-pulse">
                                NEW
                              </div>
                            )}
                            
                            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors leading-tight line-clamp-2">
                              {article.title}
                            </h3>
                            
                            {article.metaDescription && (
                              <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                                {article.metaDescription}
                              </p>
                            )}
                          </div>
                          
                          {/* Card Body */}
                          <div className="px-6 pb-4 flex-grow">
                            <p className="text-gray-700 text-sm leading-relaxed line-clamp-3 mb-4">
                              {generateExcerpt(article.content, 150)}
                            </p>
                          </div>
                          
                          {/* Card Footer */}
                          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 group-hover:bg-primary-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                {article.publishedDate && (
                                  <span className="flex items-center gap-1">
                                    <span>📅</span>
                                    <span>{new Date(article.publishedDate).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}</span>
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <span>⏱️</span>
                                  <span>{readingTime} min</span>
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1 text-primary-600 font-semibold text-sm group-hover:gap-2 transition-all">
                                <span>Read</span>
                                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </article>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

