import { prisma } from '@/lib/prisma'
import { generateExcerpt } from '@/lib/blog/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ekaty.fly.dev'

  const articles = await prisma.blogArticle.findMany({
    where: { status: 'published' },
    orderBy: { publishedDate: 'desc' },
    take: 50,
  })

  const rssItems = articles
    .map((article) => {
      const pubDate = article.publishedDate
        ? new Date(article.publishedDate).toUTCString()
        : new Date(article.createdAt).toUTCString()
      const description =
        article.metaDescription || generateExcerpt(article.content, 300)

      return `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${baseUrl}/blog/${article.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${article.slug}</guid>
      <description><![CDATA[${description}]]></description>
      <pubDate>${pubDate}</pubDate>
      <author>${article.authorName}</author>
    </item>`
    })
    .join('\n')

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>eKaty Blog - Restaurant Discovery in Katy, Texas</title>
    <link>${baseUrl}/blog</link>
    <description>Discover the best restaurants in Katy, Texas. Local tips, dining guides, and food stories from a 20-year Katy resident.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`

  return new Response(rssFeed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
