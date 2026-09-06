import { NextResponse } from 'next/server'
import { getRestaurantDetail } from '@/lib/restaurant-detail'
import {
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  primaryCuisine,
  siteUrl,
} from '@/lib/seo/restaurant-og'

/**
 * Share card for a listing that has no photograph of its own.
 *
 * Most of the 1,800 imported listings have an empty `photos` column, and the
 * alternative fallbacks are both wrong: the homepage card makes every listing
 * look like the same page, and a chain's logo makes it look like an advert. A
 * card carrying this restaurant's name is at least about this restaurant.
 */

export const runtime = 'nodejs'
export const revalidate = 86400

/** Last resort if the image renderer is unavailable in this build. */
function homepageCard() {
  return NextResponse.redirect(`${siteUrl()}/og-image.jpg`, 302)
}

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  let name = ''
  let subtitle = 'Katy, TX'

  try {
    const restaurant = await getRestaurantDetail(params.slug)
    if (!restaurant) return new NextResponse('Not found', { status: 404 })

    name = restaurant.name
    const cuisine = primaryCuisine(restaurant)
    subtitle = [cuisine, [restaurant.city, restaurant.state].filter(Boolean).join(', ')]
      .filter(Boolean)
      .join(' · ')
  } catch (error) {
    console.error(`OG card lookup failed for "${params.slug}":`, error)
    return homepageCard()
  }

  try {
    // Imported so a build without the image renderer's wasm payload degrades to
    // the redirect below instead of failing the whole route at module load.
    const { ImageResponse } = await import('next/og')

    // Long names have to shrink or they overflow the card.
    const fontSize = name.length > 44 ? 56 : name.length > 28 ? 72 : 88

    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '72px',
            background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 55%, #f87171 100%)',
            color: '#ffffff',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', fontSize: 34, letterSpacing: 6, opacity: 0.85 }}>
            EKATY.COM
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
            <div style={{ display: 'flex', marginTop: 24, fontSize: 40, opacity: 0.9 }}>{subtitle}</div>
          </div>

          <div style={{ display: 'flex', fontSize: 30, opacity: 0.8 }}>
            Hours, phone, directions and reviews on eKaty
          </div>
        </div>
      ),
      { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT }
    )
  } catch (error) {
    console.error(`OG card render failed for "${params.slug}":`, error)
    return homepageCard()
  }
}
