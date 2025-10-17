# ATLAES Logo Setup

## Current Status

✅ **Official Logo**: Using the official ATLAES logo files
✅ **Favicon**: Using logo_icon.png as favicon
✅ **Website Integration**: Logo is now displayed in the header

## Logo Files Used

### `/public/Atlaes-Logo.png`

- Official ATLAES logo
- Used in the website header
- High-quality PNG format

### `/public/logo_icon.png`

- Favicon version of the ATLAES logo
- Used as browser tab icon
- Optimized for small sizes

## Implementation Details

### HTML Meta Tags

```html
<link rel="icon" type="image/png" href="/logo_icon.png" />
<link rel="apple-touch-icon" href="/Atlaes-Logo.png" />
<meta property="og:image" content="/Atlaes-Logo.png" />
```

### React Component

```tsx
<img src="/Atlaes-Logo.png" alt="ATLAES Logo" className="h-8 w-auto" />
```

### JSON-LD Schema

```json
{
  "logo": "https://www.atlaes.de/Atlaes-Logo.png"
}
```

## Logo Usage

The ATLAES logo now appears in:

- ✅ Website header
- ✅ Browser tab (favicon)
- ✅ Social media previews (Open Graph)
- ✅ Search engine results (JSON-LD)
- ✅ Mobile home screen (Apple touch icon)

## Testing

```bash
# Build and test
pnpm web:build
pnpm web:dev

# Check logo in browser
open http://localhost:5173
```

The official ATLAES logo should now be visible throughout the website!
