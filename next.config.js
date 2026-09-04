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
    return [
      // Runs only when no static file matched: standalone builds can serve from a
      // different public/ tree than the one an upload was written to.
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ]
  },
}

module.exports = nextConfig