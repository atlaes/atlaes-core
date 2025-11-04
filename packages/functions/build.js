const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Clean dist directory
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  fs.rmSync(distPath, { recursive: true });
}
fs.mkdirSync(distPath, { recursive: true });

// Use esbuild for fast compilation
try {
  execSync('npx esbuild src/index.ts --bundle --platform=node --target=node20 --outfile=dist/index.js --external:@hono/* --external:hono --external:pg --external:postgres --external:drizzle-orm --external:bcryptjs --external:jsonwebtoken --external:google-auth-library --external:redis --external:zod --external:axios --external:dotenv', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
