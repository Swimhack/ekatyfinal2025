import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { generateExcerpt, estimateReadingTime, parseKeywords, generateArticleSchema } from '@/lib/blog/utils'
import Link from 'next/link'
import SocialShareButtons from '@/components/SocialShareButtons'

// Make this page dynamic to avoid build-time database access
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  // During build, return empty array - pages will be generated on-demand
  // This prevents build errors when DATABASE_URL isn't available
  try {
    const articles = await prisma.blogArticle.findMany({
      where: { status: 'published' },
      select: { slug: true }
    })
    
    return articles.map((article) => ({
      slug: article.slug
    }))
  } catch (error) {
    // If database isn't available during build, return empty array
    // Pages will be generated on-demand at runtime
    return []
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const article = await prisma.blogArticle.findUnique({
    where: { slug: params.slug }
  })

  if (!article || article.status !== 'published') {
    return {
      title: 'Article Not Found - eKaty',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ekaty.fly.dev'
  const excerpt = article.metaDescription || generateExcerpt(article.content)

  return {
    title: `${article.title} | eKaty Blog`,
    description: excerpt,
    keywords: article.keywords || undefined,
    openGraph: {
      title: article.title,
      description: excerpt,
      type: 'article',
      url: `${baseUrl}/blog/${article.slug}`,
      publishedTime: article.publishedDate ? new Date(article.publishedDate).toISOString() : undefined,
      authors: [article.authorName],
      images: ['/og-image.jpg'],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: excerpt,
      images: ['/og-image.jpg'],
    }
  }
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await prisma.blogArticle.findUnique({
    where: { slug: params.slug }
  })

  if (!article || article.status !== 'published') {
    notFound()
  }

  const readingTime = estimateReadingTime(article.content)
  const keywords = parseKeywords(article.keywords)
  const publishedDate = article.publishedDate ? new Date(article.publishedDate) : null
  
  // Get related articles
  const relatedArticles = await prisma.blogArticle.findMany({
    where: {
      status: 'published',
      id: { not: article.id }
    },
    orderBy: { publishedDate: 'desc' },
    take: 4,
    select: {
      id: true,
      title: true,
      slug: true,
      content: true
    }
  })

  const schema = generateArticleSchema(article)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="text-sm mb-4">
              <Link href="/" className="hover:underline">Home</Link>
              {' → '}
              <Link href="/blog" className="hover:underline">Blog</Link>
              {' → '}
              <span>{article.title}</span>
            </nav>
            <h1 className="text-4xl font-bold mb-6">{article.title}</h1>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-primary-100">
              {publishedDate && (
                <span className="flex items-center gap-2">
                  <span>📅</span>
                  <span>{publishedDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </span>
              )}
              <span className="flex items-center gap-2">
                <span>👤</span>
                <span>{article.authorName}</span>
              </span>
              <span className="flex items-center gap-2">
                <span>⏱️</span>
                <span>{readingTime} min read</span>
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <article className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-12">
            <div
              className="blog-article-content max-w-[760px] mx-auto"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* Social Sharing */}
            <SocialShareButtons
              title={article.title}
              url={`/blog/${article.slug}`}
              description={article.metaDescription || generateExcerpt(article.content, 150)}
            />

            {keywords.length > 0 && (
              <div className="mt-8 pt-8 border-t">
                <h3 className="text-lg font-semibold mb-4">Related Topics:</h3>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Author Bio */}
            <div className="mt-8 pt-8 border-t">
              <h3 className="text-lg font-semibold mb-2">
                About {article.authorName}
              </h3>
              <p className="text-gray-600">
                {article.authorName} is passionate about helping people discover great restaurants 
                in Katy, Texas. Through eKaty, we connect food lovers with the best dining experiences 
                in our community.
              </p>
            </div>
          </article>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    href={`/blog/${related.slug}`}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
                  >
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-primary-600">
                      {related.title}
                    </h3>
                    <p className="text-gray-600">
                      {generateExcerpt(related.content, 100)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Discover More Restaurants in Katy</h3>
            <p className="mb-6 text-primary-100">
              Explore our curated list of the best restaurants in Katy, Texas
            </p>
            <Link
              href="/discover"
              className="inline-block px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Browse Restaurants
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

