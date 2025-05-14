#!/bin/sh

# Write ECS-injected NEXT_PUBLIC_* env vars to .env.production
printenv | grep '^NEXT_PUBLIC_' > .env.production

# Start Next.js app
exec node server.js 