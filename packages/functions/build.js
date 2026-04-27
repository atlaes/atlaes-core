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
  execSync('npx esbuild src/index.ts --bundle --platform=node --target=node20 --outfile=dist/index.js --external:@hono/* --external:hono --external:pg --external:postgres --external:drizzle-orm --external:bcryptjs --external:jsonwebtoken --external:google-auth-library --external:redis --external:zod --external:axios --external:dotenv --external:canvas --external:mindee', {
    stdio: 'inherit',
    cwd: __dirname
  });

  // Copy data directory to dist
  const srcDataPath = path.join(__dirname, 'src', 'data');
  const distDataPath = path.join(distPath, 'data');

  if (fs.existsSync(srcDataPath)) {
    fs.mkdirSync(distDataPath, { recursive: true });

    // Copy all files from src/data to dist/data
    const files = fs.readdirSync(srcDataPath);
    files.forEach(file => {
      const srcFile = path.join(srcDataPath, file);
      const distFile = path.join(distDataPath, file);
      fs.copyFileSync(srcFile, distFile);
      console.log(`Copied ${file} to dist/data/`);
    });
  }

  // Copy Drizzle migrations into dist so the runtime migration runner can
  // find them inside the Docker image. The migrator needs both the .sql
  // files and the meta/ subdirectory (journal + snapshots), hence recursive.
  const srcMigrationsPath = path.join(__dirname, 'src', 'drizzle', 'migrations');
  const distMigrationsPath = path.join(distPath, 'migrations');
  if (fs.existsSync(srcMigrationsPath)) {
    fs.cpSync(srcMigrationsPath, distMigrationsPath, { recursive: true });
    console.log('Copied migrations directory to dist/migrations/');
  }

  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
