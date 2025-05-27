#!/bin/sh

# Write ECS-injected NEXT_PUBLIC_* env vars to public/runtime-config.json
node write-runtime-config.js

# Start Next.js app (standalone)
exec node server.js 