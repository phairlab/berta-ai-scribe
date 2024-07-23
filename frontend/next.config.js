/** @type {import('next').NextConfig} */

let nextConfig = {};

// Snowflake service CSP settings for development.
// https://docs.snowflake.com/en/developer-guide/snowpark-container-services/additional-considerations-services-jobs#responses-outgoing-to-the-clients
const snowflakeCspHeader = `
default-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.openai.com:443 blob: data:;
object-src 'none';
connect-src 'self' https://api.openai.com:443 wss://api.openai.com:443;
frame-ancestors 'self';
`;

if (process.env.NODE_ENV == "development") {
  nextConfig = {
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            {
              key: "Content-Security-Policy",
              value: snowflakeCspHeader.replace(/\n/g, ""),
            },
          ],
        },
      ];
    },
  };
}

module.exports = nextConfig;
