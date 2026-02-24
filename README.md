# AdZeta GTM OS

Autonomous GTM Command Center for lead generation and sales operations.

## Features

- **Phase 1: Foundation** — World-class UI, KPI dashboard, design system
- **Phase 2: Learning Core** — Predictions, personalization, feedback capture
- **Phase 3: Intelligence** — Decision synthesis, execution bridge
- **Phase 4: Autonomy** — Self-healing, predictive guard, autonomous task generation

## Tech Stack

- Next.js 15.5.12
- React 19
- TypeScript
- Tailwind CSS
- Supabase (pending integration)

## Environment Variables

```bash
# Required
NEXT_PUBLIC_BACKEND_URL=https://your-backend.vercel.app
CC_ADMIN_USERNAME=admin
CC_ADMIN_PASSWORD=your-secure-password
CC_OPERATOR_USERNAME=operator
CC_OPERATOR_PASSWORD=your-secure-password

# Supabase (for persistence)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Development

```bash
npm install
npm run dev
npm run build
npm test
```

## Deployment

Auto-deploys to Vercel on push to main.
