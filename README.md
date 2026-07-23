# Pawtner

AI-assisted pet adoption matching, private foster CRM, materials commerce, and **legal organization donation redirects** for Taiwan.

Canonical product spec: [Notion AI Implementation Plan](https://app.notion.com/p/3a6a4181b628815fa430c421d73ce655)

## Hard boundaries

- Materials e-commerce and SaaS only for commercial payments
- Donation flows are **outbound redirects** to licensed partner orgs (permit metadata required)
- **No** private foster cash fundraising, progress bars, payouts, or wallets

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Auth, Postgres RLS, Storage)
- Zod + React Hook Form + TanStack Query
- Vitest

## Repositories

- GitHub: https://github.com/richappdev/Pawtner
- Supabase Dev: https://rlwctljjjvlxrexcgqmg.supabase.co (`rlwctljjjvlxrexcgqmg`)

## Setup

```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY from Supabase dashboard

npm install
npm run dev
```

### Link Supabase (required once)

```bash
supabase login
supabase init   # already done in this repo
supabase link --project-ref rlwctljjjvlxrexcgqmg
supabase db push
```

## Branch policy

`main` · `develop` · `feature/*` · `fix/*` · `release/*` · `hotfix/*`

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local app |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |

## App surfaces

| Path | Audience |
|------|----------|
| `/` | Marketing landing |
| `/explore` … `/me` | Adopter |
| `/foster/*` | Foster console |
| `/admin/*` | Admin |
| `/products` | Materials shop |
| `/donate/[orgSlug]` | Legal org redirect (not private fundraising) |
| `/legal/*` | Policy stubs (pending counsel review) |
| `/pilot` | Pilot go-live checklist |

## North star

Monthly successful adoptions that pass 30-day follow-up.
