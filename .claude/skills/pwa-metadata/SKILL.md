---
name: pwa-metadata
description:
  Fix and enhance PWA configuration, metadata, Open Graph tags, and mobile app experience. Use when
  link previews are broken, PWA has display issues, or icons are missing.
user-invocable: true
allowed-tools: Read, Grep, Glob, Edit, Bash, Write
argument-hint: [issue to fix, e.g. "og image", 'pwa icons', 'safe area']
---

# PWA & Metadata Configuration

Fix and enhance PWA, Open Graph, and mobile experience for the Dars Website.

If arguments are provided, focus on: $ARGUMENTS

## Key Files

| File                       | Purpose                                     |
| -------------------------- | ------------------------------------------- |
| `src/app/layout.tsx`       | Metadata, viewport, icons, manifest link    |
| `public/manifest.json`     | PWA config, icons, display mode, shortcuts  |
| `src/app/sw.ts`            | Service worker (Serwist)                    |
| `src/app/globals.css`      | Safe area insets, standalone mode styles    |
| `src/app/offline/page.tsx` | Offline fallback page                       |
| `public/og-image.png`      | Social media preview (1200x630)             |
| `public/icons/`            | PWA app icons (192, 512, maskable variants) |
| `public/D-icon.svg`        | SVG favicon                                 |

## Open Graph / Link Preview

### metadataBase must match deployed domain

```tsx
metadataBase: new URL(
  process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'https://dars.com')
),
```

- `NEXT_PUBLIC_SITE_URL` should be set in Vercel env vars to the actual domain
- `NEXT_PUBLIC_VERCEL_URL` is auto-provided by Vercel as fallback
- Without correct metadataBase, OG images resolve to wrong domain

### OG Image requirements

- Size: 1200x630px PNG
- Located at `public/og-image.png`
- Referenced as `/og-image.png` in metadata (Next.js resolves with metadataBase)

### Required OG tags (already in layout.tsx)

```tsx
openGraph: {
  type: 'website',
  locale: 'en_US',
  alternateLocale: ['ar_SA'],
  images: [{ url: '/og-image.png', width: 1200, height: 630, alt: '...' }],
},
twitter: {
  card: 'summary_large_image',
  images: ['/og-image.png'],
},
```

## Icons

### Rules

- **Apple touch icon MUST be PNG** — iOS does not support SVG for apple-touch-icon
- SVG is fine for browser favicon (`rel="icon"`)
- Use icons from `public/icons/` for PNG needs

### Current setup

```tsx
icons: {
  icon: [
    { url: '/D-icon.svg', type: 'image/svg+xml' },
    { url: '/icons/icon-192x192.png', type: 'image/png', sizes: '192x192' },
  ],
  apple: [{ url: '/icons/icon-192x192.png', type: 'image/png', sizes: '192x192' }],
  shortcut: '/D-icon.svg',
},
```

### Available icon files

- `/public/D-icon.svg` — SVG favicon
- `/public/icons/icon-192x192.png` — standard PWA icon
- `/public/icons/icon-512x512.png` — large PWA icon
- `/public/icons/icon-maskable-192x192.png` — maskable (Android adaptive)
- `/public/icons/icon-maskable-512x512.png` — maskable large
- **NOTE**: `/public/icon.svg` does NOT exist — never reference it

## PWA Standalone Mode

### viewport-fit: cover

Required for full-screen content on notched phones:

```tsx
export const viewport: Viewport = {
  viewportFit: 'cover',
  // ...
};
```

### Safe area insets (in globals.css)

```css
@media (display-mode: standalone) {
  html {
    padding-top: env(safe-area-inset-top);
    background-color: #0a3161; /* brand blue behind status bar */
  }
  body {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

### Status bar style

Must be consistent across metadata and meta tags:

```tsx
appleWebApp: { statusBarStyle: 'black-translucent' },
other: { 'apple-mobile-web-app-status-bar-style': 'black-translucent' },
```

- `black-translucent` = content extends behind status bar (needs safe-area padding)
- `default` = white status bar
- `black` = black status bar

### Bottom navigation safe area

Bottom navs already handle this:

```tsx
className = 'pb-[env(safe-area-inset-bottom)]';
```

## Manifest (public/manifest.json)

### Current config

- `display: "standalone"` — full app-like experience
- `orientation: "portrait-primary"`
- `theme_color: "#0A3161"` — brand blue
- `background_color: "#ffffff"`
- Icons: 192 and 512 in both regular and maskable variants
- Shortcuts: "Find a Tutor", "My Subscriptions"

### Known limitation

- `lang: "en"` and `dir: "ltr"` are hardcoded
- App supports Arabic RTL but manifest doesn't adapt dynamically
- This is a PWA spec limitation — manifest is static

## Service Worker (Serwist)

- Package: `@serwist/next`
- Source: `src/app/sw.ts`
- Compiled to: `public/sw.js`
- Disabled in development
- Features: precaching, skipWaiting, clientsClaim, navigationPreload
- Offline fallback: `/offline` route

## Debugging

### Test OG tags

- Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- Use [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- Check `<meta property="og:image">` resolves to full URL

### Test PWA

- Chrome DevTools > Application > Manifest
- Check "Add to Home Screen" in Application panel
- Test standalone mode with `?standalone=true` or install the PWA

### Common issues

1. **OG image not showing**: metadataBase wrong, image path wrong, or image too small
2. **PWA header overlaps status bar**: Missing `viewport-fit: cover` or safe area CSS
3. **Apple icon not showing**: Using SVG instead of PNG
4. **Manifest not loading**: Check `<link rel="manifest">` in HTML source
