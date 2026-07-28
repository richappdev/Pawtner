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
| `npm run test:db` | Local Supabase pgTAP suite |
| `npm run test:ui` | Playwright responsive and route smoke tests |

## Government and private foster pets

Pawtner supports two pet sources in the same discovery and favorites experience:

- `private_foster`: created and managed by an approved Pawtner foster, reviewed by staff, and eligible for a Pawtner adoption application.
- `government`: synchronized from the nationwide Ministry of Agriculture animal adoption dataset and handed off to the official shelter for adoption inquiries.

Government records retain their original source payload and provenance. Staff may add a separate
display name, personality summary, special-care notes, adoption conditions, and tags without those
fields being overwritten by later synchronization.

Important behavior:

- Government pets cannot receive Pawtner adoption applications. This is enforced by the API, RLS,
  and a database trigger.
- A missing government listing becomes `departed_unconfirmed`, hidden, and unpublished. It is never
  interpreted as a confirmed adoption.
- Government images remain on the allow-listed `www.pet.gov.tw/upload/pic/**` host.
- Public pages show the official shelter contact and MOA attribution under the
  [Open Government Data License v1.0](https://data.gov.tw/license), without implying endorsement.
- Search and filtering are database-backed and support query, species, region, source, availability,
  and cursor pagination.

### Government data synchronization

The `sync-moa-pets` Supabase Edge Function fetches the MOA API in 1,000-record pages, validates and
hashes each record, retries transient failures, and writes service-role-only, run-scoped staging
batches. No live pet is changed until the complete feed passes the count and 50% safety guards; the
database then merges the staged feed atomically. Missing-record reconciliation happens only after
that complete successful fetch. Empty, incomplete, duplicate, or sharply reduced results are
rejected.

Government publication is intentionally separate from synchronization:

1. **Sync and stage:** normalized data, private raw payload, content hash, and quality issues are
   staged for one sync run.
2. **Validate and clean:** required shelter/species/date problems are `blocked`; incomplete optional
   data is a `warning`. A successful complete run writes the live source record and issue queue.
3. **Wait for review:** new and reappearing listings enter `pending_review`, remain hidden, and are
   never auto-published by sync.
4. **Approve:** staff reviews source fields and enrichment, then moves a non-blocked record to
   `approved`.
5. **Publish:** staff explicitly publishes an approved record. The database rechecks official
   availability, adoption-open date, quality, source state, and editorial hold in one transaction.

Official closure, future availability, a new blocker, or disappearance from a complete feed
immediately unpublishes a listing as `unpublished_source_change`. Reappearance returns it to
`pending_review`; it does not restore publication automatically. Every manual and automatic
publication transition is recorded in `pet_publication_events`.

The intended production schedule is daily at **10:30 UTC / 18:30 Taiwan time** through Supabase
Cron. Manual dry runs and real syncs are available to administrators from `/admin/pets`.

Required server-only configuration:

```env
FEATURE_GOVERNMENT_PETS_ENABLED=false
MOA_SYNC_SECRET=
```

Government data has two release gates:

1. `FEATURE_GOVERNMENT_PETS_ENABLED` controls web application visibility.
2. `pet_sources.public_enabled` controls visibility in the public database read model.

Both remain disabled during initial import and inspection. See
[Government pet rollout](docs/government-pet-rollout.md) for secrets, deployment, staged enablement,
Cron activation, and monitoring.

## App surfaces

| Path | Audience |
|------|----------|
| `/` | Marketing landing |
| `/explore` … `/me` | Adopter |
| `/foster/*` | Foster console |
| `/foster/pets/[id]/edit` | Private foster pet editing |
| `/admin/*` | Admin |
| `/admin/pets` | Pet review, government source filtering, and MOA sync status |
| `/products` | Materials shop |
| `/donate/[orgSlug]` | Legal org redirect (not private fundraising) |
| `/legal/*` | Policy stubs (pending counsel review) |
| `/pilot` | Pilot go-live checklist |

## North star

Monthly successful adoptions that pass 30-day follow-up.
