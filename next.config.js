/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: [
      'localhost',
      'ekaty.com',
      'ekaty.fly.dev',
      'images.unsplash.com',
      'lh3.googleusercontent.com', // Google Places photos
      'maps.googleapis.com', // Google Maps static images
      'res.cloudinary.com', // If using Cloudinary
      'supabase.co', // Supabase storage
      'supabase.com'
    ],
  },
  experimental: {
    serverActions: {
      // Hero uploads cap at 5MB in the route handler; the framework limit is
      // set higher so multipart overhead can never be what rejects a valid file.
      // Reverse proxies need a matching client_max_body_size.
      bodySizeLimit: '10mb',
    },
    instrumentationHook: true,
  },
  async rewrites() {
    return {
      // Anything a browser could treat as active content never reaches the
      // static handler. New uploads can only be raster images, but files stored
      // before that gate existed must not be served as SVG/HTML/JS from this
      // origin; the route handler sends them as a download instead.
      beforeFiles: [
        {
          source: '/uploads/:path(.*\\.(?:svgz?|x?html?|shtml|m?js|cjs|css|xml|xsl|json|pdf|swf|htaccess))',
          destination: '/api/uploads/:path',
        },
      ],
      // Runs only when no static file matched: standalone builds can serve from a
      // different public/ tree than the one an upload was written to.
      afterFiles: [
        {
          source: '/uploads/:path*',
          destination: '/api/uploads/:path*',
        },
      ],
    }
  },
  async headers() {
    return [
      {
        // Defence in depth for statically served uploads: no sniffing, and no
        // active content even if a file slipped in before the type gate.
        source: '/uploads/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Content-Security-Policy', value: "default-src 'none'; sandbox" },
        ],
      },
    ]
  },
}

module.exports = nextConfig