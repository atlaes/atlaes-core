# VBL Refund Platform

A Next.js application for handling German pension refund applications.

## Features

- Modern Next.js 14 with App Router
- TypeScript support
- Tailwind CSS for styling
- Responsive design
- Secure document handling
- User authentication
- Application tracking

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint
```

## Project Structure

```
apps/vbl/
├── app/                 # Next.js App Router
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
├── components/         # React components
├── lib/               # Utility functions
├── public/            # Static assets
└── types/             # TypeScript types
```

## Deployment

This app is configured to deploy with SST to AWS.
