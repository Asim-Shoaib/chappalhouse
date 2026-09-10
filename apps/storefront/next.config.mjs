/** @type {import('next').NextConfig} */
const nextConfig = {
  // The catalog seed lives at the repo root, outside this app directory.
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  images: {
    // Photos are pre-converted to sized WebP by scripts/process-images.mjs.
    // Re-optimizing them on request costs CPU for no gain and makes dev
    // unusable with a full catalog on screen.
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/order/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
        ],
      },
    ]
  },
}

export default nextConfig
