/** @type {import('next').NextConfig} */
let nextConfig = {
  output: 'standalone',
  // Add this to ensure proper asset prefixing
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  experimental: {
    proxyTimeout: 300 * 1000,
    swcPlugins: [
      ["@swc-jotai/debug-label", {}],
      ["@swc-jotai/react-refresh", {}],
    ],
  },
  // Ensure environment variables are properly exposed
  env: {
    NEXT_PUBLIC_USE_COGNITO: process.env.NEXT_PUBLIC_USE_COGNITO,
    NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
    NEXT_PUBLIC_COGNITO_REDIRECT_URI: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          // Add this CORS header for static files
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  // Add this webpack config to fix chunk loading errors
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};

// Configure development-only settings.
if (process.env.NODE_ENV === "development") {
  // These CSP settings match those imposed by Snowflake, to be used during local development.
  // Doesn't include the injected values for external integrations (which should not be happening through the client in any case).
  const developmentCSPSettings = `
  default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:;
  object-src 'none';
  connect-src 'self' http://localhost:8000 ws://localhost:4000;
  frame-ancestors 'self';
  `;

  nextConfig = {
    ...nextConfig,
    ...{
      async headers() {
        return [
          {
            source: "/(.*)",
            headers: [
              {
                // Simulate Snowflake CSP restrictions.
                key: "Content-Security-Policy",
                value: developmentCSPSettings.replace(/\n/g, ""),
              },
            ],
          },
        ];
      },
    },
  };
}

module.exports = nextConfig;
