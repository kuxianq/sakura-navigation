# Sakura Navigation

A lightweight personal navigation/start page for Cloudflare Pages.

It includes a public homepage and an admin console for managing site entries, categories, appearance settings, access-password preview settings, and local AI key command simulation.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Cloudflare Pages

## Local development

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
npm run lint
```

## Deploy to Cloudflare Pages

Recommended Pages settings:

```text
Framework preset: Vite
Build command: npm ci && npm run build
Build output directory: dist
Node version: 22
```

Environment variables can be configured from `.env.example` when needed.

D1 is not required for the current static/local-storage version. Bind D1 only when enabling the production database/API flow.
