# ATLAES Corporate Website

A modern React-based corporate website for ATLAES GmbH, built with Vite and deployed with SST.

## Development

### From Monorepo Root

```bash
# Start development server
pnpm web:dev

# Build for production
pnpm web:build

# Clean build artifacts
pnpm --filter web clean
```

### From Web Directory

```bash
cd apps/web

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

- ✅ **React 18** with TypeScript
- ✅ **Vite** for fast development and building
- ✅ **Tailwind CSS** for styling
- ✅ **Lucide React** for icons
- ✅ **Responsive design** for all devices
- ✅ **SEO optimized** with proper meta tags
- ✅ **Static deployment** ready for AWS S3 + CloudFront

## Deployment

The website is configured for deployment with SST to AWS:

```bash
# Deploy to production
npx sst deploy --stage production
```

This will create:

- S3 bucket for static files
- CloudFront distribution for global CDN
- Route 53 DNS configuration
- SSL certificate for HTTPS

## Project Structure

```
apps/web/
├── src/
│   ├── App.tsx          # Main React component
│   ├── main.tsx         # React entry point
│   └── index.css        # Tailwind styles
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.ts       # Vite configuration
└── tailwind.config.js   # Tailwind configuration
```

## Performance

- 🚀 **Fast builds** - Vite is much faster than Next.js
- 📦 **Small bundle** - Optimized for static deployment
- ⚡ **Fast loading** - Global CDN distribution
- 💰 **Cost effective** - S3 + CloudFront only
