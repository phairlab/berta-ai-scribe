const fs = require('fs');
const path = require('path');

// Ensure the public directory exists
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Get environment variables with fallbacks
const config = {
  NEXT_PUBLIC_USE_COGNITO: process.env.NEXT_PUBLIC_USE_COGNITO || 'false',
  NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
  NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
  NEXT_PUBLIC_COGNITO_REDIRECT_URI: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || '',
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || '',
};

// Log the config being written (excluding sensitive values)
console.log('Writing runtime config with values:', {
  ...config,
  NEXT_PUBLIC_COGNITO_CLIENT_ID: config.NEXT_PUBLIC_COGNITO_CLIENT_ID ? '[REDACTED]' : '',
});

try {
  fs.writeFileSync(
    path.join(publicDir, 'runtime-config.json'),
    JSON.stringify(config, null, 2)
  );
  console.log('Successfully wrote runtime config');
} catch (error) {
  console.error('Failed to write runtime config:', error);
  process.exit(1);
} 