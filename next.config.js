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
      // Hero image uploads allow up to 5MB, so the request body limit has to match.
      bodySizeLimit: '5mb',
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