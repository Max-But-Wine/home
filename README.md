# Fromage Society SA PWA

A complete, mobile-first progressive web app for a South African cheese & wine membership business.

## What this app includes

- Membership product with 3 tiers:
  - Cheese Club (starter)
  - Cheese + Wine Club (core)
  - Cellar Select (premium)
- MVP pages/sections:
  - Home
  - Membership compare
  - This month's box teaser
  - How it works
  - FAQ
  - Account/member portal
  - Admin tools
  - Legal (T&Cs / POPIA privacy / returns / compliance)
- PWA features:
  - Web manifest
  - Service worker asset caching
  - Install prompt support

## Static hosting on GitHub Pages

This repo is static HTML/CSS/JS and deploys directly from root.

1. Push branch to GitHub.
2. Open **Settings → Pages**.
3. Select **Deploy from a branch**.
4. Choose your branch and `/` root folder.
5. Save.

## Local run / build

No bundler is required. To "build" for static hosting, validate by serving files locally:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.
