# Fromage Society SA PWA

A complete, mobile-first progressive web app for a South African **starter cheese membership** with digital wine pairing intelligence.

## Will this work on GitHub Pages?

Yes. This repository is plain static HTML/CSS/JS, so it works on GitHub Pages.

- No Node build step is required.
- Assets are relative-path based (`./` style), which is Pages-friendly.
- A GitHub Actions workflow is included at `.github/workflows/deploy-pages.yml` to build (validate) and deploy automatically.

## Deploying to GitHub Pages

### Option A: Automatic deploy with GitHub Actions (recommended)

1. Push this repository to GitHub.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to your deployment branch (`main`, `master`, or `work`) to trigger deployment.
4. Open the Pages URL shown in the workflow run output.

### Option B: Branch-based deploy

1. Push the repo.
2. In **Settings → Pages**, set source to **Deploy from a branch**.
3. Select the branch and root folder (`/`).
4. Save.

## Features included

- Membership product with **1 tier only**:
  - Cheese Club (starter)
- Cheese-only monthly delivery with digital wine pairing notes.
- Built-in mobile app section to:
  - add a personal wine collection,
  - request cheese pairings from an LLM endpoint (`/api/llm/pairings`),
  - gracefully fallback to local pairing rules when offline/unconfigured.
- MVP sections:
  - Home
  - Membership
  - This month teaser
  - Mobile app pairing tool
  - How it works
  - FAQ
  - Account / member portal
  - Admin tools
  - Legal (food handling / POPIA / returns)
- PWA capabilities:
  - Web manifest
  - Service worker caching
  - Install prompt handling

## Local build/validation

No bundler is needed. Validate by serving locally:

```bash
python3 -m http.server 4173
```

Then open:

- `http://localhost:4173`
