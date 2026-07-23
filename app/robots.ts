import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

const DISALLOWED = ['/api/', '/admin/', '/auth/', '/dashboard/', '/owner/', '/restaurant-dashboard/', '/settings/']

// AI/answer-engine crawlers: explicitly welcome on public pages so the
// directory is citable in AI search results (GEO)
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'cohere-ai',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: DISALLOWED,
      },
      ...AI_CRAWLERS.map((bot) => ({
        userAgent: bot,
        allow: '/',
        disallow: DISALLOWED,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
