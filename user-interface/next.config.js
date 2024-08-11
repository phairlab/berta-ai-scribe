/** @type {import('next').NextConfig} */
let nextConfig = {
  experimental: {
    // Configure for next-logging.
    serverComponentsExternalPackages: ["pino", "pino-pretty"],
  },
};

if (process.env.LOGGING_LEVEL === "trace") {
  nextConfig = { ...nextConfig, logging: { fetches: { fullUrl: true } } };
}

// These CSP settings match those imposed by Snowflake, to be used during local development.
// Doesn't include the injected values for external integrations (which should not be happening through the client in any case).
// https://docs.snowflake.com/en/developer-guide/snowpark-container-services/additional-considerations-services-jobs#responses-outgoing-to-the-clients
const developmentCSPSettings = `
default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:;
object-src 'none';
connect-src 'self';
frame-ancestors 'self';
`;

// Configure development-only settings.
if (process.env.NODE_ENV == "development") {
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
