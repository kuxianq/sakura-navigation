# Sakura Navigation

A lightweight personal navigation/start page for Cloudflare Pages.

It includes a public homepage and an admin console for managing site entries, categories, appearance settings, access protection, and AI key command simulation.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Cloudflare Pages
- Cloudflare D1

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

Required bindings and variables:

```text
D1 binding: DB
ADMIN_PASSWORD: initial admin password
ADMIN_SESSION_SECRET: random session secret
PUBLIC_BG_API: optional random background API
```

Run `migrations/0001_initial.sql` on the D1 database before using the admin console.
