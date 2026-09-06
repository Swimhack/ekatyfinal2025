import { NextResponse } from 'next/server'

/**
 * Share card for /ask.
 *
 * The page set an `openGraph` block with no `images`, and Next does not inherit
 * the parent's images into a child that declares its own openGraph — so a share
 * of Ask eKaty carried no image at all, while the Twitter tags fell through to
 * the root layout and advertised the homepage instead. This is the image both
 * now point at.
 *
 * Rendered rather than shipped as a static file so the wording lives in the
 * repository next to the page copy it mirrors.
 */

export const runtime = 'nodejs'
export const revalidate = 86400

const WIDTH = 1200
const HEIGHT = 630

export async function GET() {
  try {
    // Imported inside the handler so a build without the image renderer's wasm
    // payload degrades to the site card rather than failing at module load.
    const { ImageResponse } = await import('next/og')

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
            <div style={{ display: 'flex', fontSize: 92, fontWeight: 700, lineHeight: 1.1 }}>
              Ask eKaty
            </div>
            <div style={{ display: 'flex', marginTop: 20, fontSize: 46, opacity: 0.92 }}>
              Where should we eat in Katy?
            </div>
          </div>

          <div style={{ display: 'flex', fontSize: 30, opacity: 0.8 }}>
            Three real Katy picks — by party size, budget, area and vibe
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
  } catch (error) {
    console.error('Ask OG card render failed:', error)
    const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://ekaty.com').replace(/\/+$/, '')
    return NextResponse.redirect(`${siteUrl}/og-image.jpg`, 302)
  }
}
