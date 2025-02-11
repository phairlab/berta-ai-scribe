/** @type {import('next').NextConfig} */
let nextConfig = {
  experimental: {
    proxyTimeout: 300 * 1000,
    swcPlugins: [
      ["@swc-jotai/debug-label", {}],
      ["@swc-jotai/react-refresh", {}],
    ],
  },
};

// Configure development-only settings.
if (process.env.NODE_ENV == "development") {
  // These CSP settings match those imposed by Snowflake, to be used during local development.
  // Doesn't include the injected values for external integrations (which should not be happening through the client in any case).
  // https://docs.snowflake.com/en/developer-guide/snowpark-container-services/additional-considerations-services-jobs#responses-outgoing-to-the-clients
  const developmentCSPSettings = `
  default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:;
  object-src 'none';
  connect-src 'self';
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
