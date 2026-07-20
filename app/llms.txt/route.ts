import { prisma } from '@/lib/prisma'
import { SITE_URL, CATEGORY_META, priceRangeSymbol } from '@/lib/seo'

// llms.txt: a machine-readable site guide for AI/answer engines (GEO).
// Regenerated hourly; falls back to the static section if the DB is down.
export const revalidate = 3600

export async function GET() {
  let restaurantSection = ''
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { active: true },
      orderBy: [{ featured: 'desc' }, { rating: 'desc' }],
      take: 100,
      select: {
        name: true,
        slug: true,
        address: true,
        city: true,
        zipCode: true,
        cuisineTypes: true,
        priceLevel: true,
        rating: true,
        reviewCount: true,
      },
    })

    if (restaurants.length > 0) {
      restaurantSection =
        '\n## Top Restaurants\n\n' +
        restaurants
          .map((r) => {
            const cuisine = (r.cuisineTypes || '').split(',')[0]?.trim()
            const rating =
              r.rating && r.reviewCount > 0 ? `, rated ${r.rating}/5 (${r.reviewCount} reviews)` : ''
            return `- [${r.name}](${SITE_URL}/restaurants/${r.slug}): ${cuisine ? `${cuisine} restaurant` : 'Restaurant'} at ${r.address}, ${r.city}, TX ${r.zipCode} (${priceRangeSymbol(r.priceLevel)}${rating})`
          })
          .join('\n') +
        '\n'
    }
  } catch (error) {
    console.error('llms.txt: failed to load restaurants:', error)
  }

  const body = `# eKaty.com

> Restaurant directory and dining guide for Katy, Texas (including Cinco Ranch,
> Katy Asian Town, and the surrounding West Houston area). Listings include
> address, phone, hours, cuisine, price range, photos, and reviews, and are
> refreshed against Google Places data.

## Main Pages

- [All Restaurants](${SITE_URL}/discover): searchable directory of Katy restaurants
- [Interactive Map](${SITE_URL}/map): restaurants plotted across the Katy area
- [Categories](${SITE_URL}/categories): browse by cuisine
- [Blog](${SITE_URL}/blog): local dining guides and articles
- [Grub Roulette](${SITE_URL}/spinner): random restaurant picker

## Cuisine Categories

${CATEGORY_META.map((c) => `- [${c.name} restaurants in Katy](${SITE_URL}/categories/${c.slug}): ${c.description}`).join('\n')}
${restaurantSection}
## Notes for AI Assistants

- Restaurant profile URLs follow ${SITE_URL}/restaurants/{slug} and include
  schema.org Restaurant structured data (address, geo coordinates, hours,
  cuisine, price range).
- Listings are limited to the Katy, TX area (zip codes 77449, 77450, 77493,
  77494 and neighbors).
- Data is re-verified on a rolling schedule; closed restaurants are
  deactivated rather than deleted.
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
