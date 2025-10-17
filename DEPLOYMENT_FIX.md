# ATLAES Logo Deployment Fix

## Issue

The logo and favicon files are not working after SST deployment to staging.

## Root Cause

The SST configuration was using `npm` commands instead of `pnpm` for the monorepo setup.

## Fixes Applied

### 1. Updated SST Configuration

**File**: `sst.config.ts`

```typescript
new sst.aws.StaticSite('AtlaesWebsite', {
  path: 'apps/web',
  build: {
    command: 'pnpm build', // Changed from npm to pnpm
    output: 'dist',
  },
  dev: {
    command: 'pnpm dev', // Changed from npm to pnpm
    title: 'Atlaes Website',
    url: 'http://localhost:5173', // Updated port
  },
  customDomain: {
    domainName: 'atlaes.de',
    hostedZone: 'atlaes.de',
  },
});
```

### 2. Enhanced Vite Configuration

**File**: `apps/web/vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true, // Ensures public files are copied
  },
  publicDir: 'public', // Explicitly set public directory
});
```

### 3. Logo Files Verification

✅ **Files exist**: `/public/Atlaes-Logo.png` and `/public/logo_icon.png`
✅ **Build copies files**: Files are copied to `dist/` folder
✅ **HTML references**: Correct paths in HTML and React components

## Deployment Steps

### 1. Test Build Locally

```bash
cd apps/web
pnpm build
ls -la dist/  # Should show logo files
```

### 2. Deploy to Staging

```bash
# From project root
npx sst deploy --stage staging
```

### 3. Deploy to Production

```bash
npx sst deploy --stage production
```

## Verification

After deployment, check:

1. **Website header**: Logo should appear in header
2. **Browser tab**: Favicon should show in browser tab
3. **Network tab**: Logo files should load without 404 errors
4. **Console**: No errors related to missing assets

## Troubleshooting

### If logos still don't work:

1. **Check build output**:

   ```bash
   cd apps/web && pnpm build
   ls -la dist/
   ```

2. **Verify SST deployment**:

   ```bash
   npx sst list
   ```

3. **Check CloudFront cache**:
   - May need to invalidate CloudFront cache
   - Or wait for cache to expire (24 hours)

4. **Check file paths**:
   - Ensure paths in HTML are correct: `/Atlaes-Logo.png`
   - Not relative paths: `./Atlaes-Logo.png`

## Expected Result

After deployment:

- ✅ Logo appears in website header
- ✅ Favicon shows in browser tab
- ✅ No 404 errors for logo files
- ✅ Social media previews show logo
