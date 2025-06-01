const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const config = {
  NEXT_PUBLIC_USE_COGNITO: process.env.NEXT_PUBLIC_USE_COGNITO || 'false',
  NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
  NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
  NEXT_PUBLIC_COGNITO_REDIRECT_URI: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI || '',
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || '',
};

try {
  fs.writeFileSync(
    path.join(publicDir, 'runtime-config.json'),
    JSON.stringify(config, null, 2)
  );
} catch (error) {
  process.exit(1);
} 