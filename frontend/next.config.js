/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  images: {
    domains: ['example.com'], // add more domains if needed
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        source: '/(.*)', // Apply to all routes
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval'", // consider removing 'unsafe-eval' in prod
              "style-src 'self' 'unsafe-inline'", // for Tailwind inline styles
              "img-src 'self' data: https:",
              "connect-src 'self' ws: wss:",
              "font-src 'self' https: data:",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Optional: enable React 18 streaming & modern features
  experimental: {
    appDir: true, // if using Next.js App Router
    serverComponentsExternalPackages: ['axios', 'gsap'], // avoid bundling large libs unnecessarily
  },
};

module.exports = nextConfig;
