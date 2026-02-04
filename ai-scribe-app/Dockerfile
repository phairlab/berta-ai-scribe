# Build stage
FROM --platform=linux/amd64 node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Remove ALL environment files to prevent hardcoding
#RUN rm -f .env .env.local .env.development .env.production

# Build args for Next.js (baked in at build time)
ARG NEXT_PUBLIC_USE_GOOGLE_AUTH=false
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Set as env vars for the build
ENV NEXT_PUBLIC_USE_GOOGLE_AUTH=$NEXT_PUBLIC_USE_GOOGLE_AUTH
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

# Build application
RUN npm run build

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Production stage
FROM --platform=linux/amd64 node:20-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Install wget for health check
RUN apk add --no-cache wget

# Copy only the necessary files from the standalone output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy runtime config writer script into production image
COPY --from=builder /app/write-runtime-config.js ./write-runtime-config.js

# Copy entrypoint script into production image
COPY --from=builder /app/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Set permissions so nextjs user can write to /app
RUN chown -R nextjs:nodejs /app

# Environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4000
ENV HOSTNAME=0.0.0.0

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4000/ || exit 1

# Start the application with entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]