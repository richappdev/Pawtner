# Firebase App Hosting to Firebase Hosting migration

## Status

Implemented on July 29, 2026. Production traffic is served by Firebase Hosting
and the independent Cloud Run service. The App Hosting backend remains online
as the rollback endpoint while the observation window is open.

## Objective

Migrate Pawtner from Firebase App Hosting to Firebase Hosting backed by an
independently managed Cloud Run service.

The public production URL will be:

- Primary: `https://pawtner-tw.web.app`
- Firebase alias: `https://pawtner-tw.firebaseapp.com`

The current App Hosting URL remains the rollback endpoint during the migration:

- `https://pawtner-web--pawtner-app-2026.asia-east1.hosted.app`

## Important constraints

- The existing default Hosting site, `pawtner-app-2026`, cannot be renamed.
- `pawtner-tw` is a secondary Hosting site in the
  `pawtner-app-2026` Firebase project.
- Firebase Hosting site IDs are globally unique. Firebase accepted and created
  the `pawtner-tw` site on July 29, 2026.
- Firebase Hosting cannot run this SSR Next.js application by itself. Hosting
  will serve public static files and rewrite application traffic to Cloud Run.
- The existing `pawtner-web` Cloud Run service is managed by App Hosting. The
  migration must use a separate service so future App Hosting deployments cannot
  overwrite the new production runtime.

## Implemented resources

| Resource | Value |
| --- | --- |
| Hosting site | `pawtner-tw` |
| Hosting target | `production` |
| Hosting version | `7b5219d8f38aeedc` |
| Cloud Run service | `pawtner-hosting-web` |
| Cloud Run revision | `pawtner-hosting-web-00001-zk4` |
| Runtime service account | `pawtner-hosting-run@pawtner-app-2026.iam.gserviceaccount.com` |
| Artifact Registry repository | `asia-east1-docker.pkg.dev/pawtner-app-2026/pawtner-images` |
| Image digest | `sha256:2cdaff25a1cd89f5ec15c67342dfaee8e04de6669cff31805f53cc31d0170f8d` |
| Cloud Build | `22ecf73e-9326-4420-ae76-1f3c7e6086ce` |
| Preview channel | `app-hosting-migration` (expires August 5, 2026) |

The runtime service account has `roles/firebaseauth.admin` for the existing
user/custom-claim provisioning endpoint. Secret Manager access is granted on
the required secrets rather than project-wide.

## Target architecture

```text
Browser
  |
  v
Firebase Hosting site: pawtner-tw
  |  https://pawtner-tw.web.app
  |
  +-- exact files from public/
  |
  `-- all other paths
        |
        v
Cloud Run: pawtner-hosting-web (asia-east1)
        |
        +-- Next.js SSR and route handlers
        +-- Firebase Authentication
        `-- Supabase database and storage
```

## Phase 0: Confirm ownership and availability

1. Confirm the operator has sufficient access to:
   - Firebase project `pawtner-app-2026`
   - Firebase Hosting
   - Cloud Run and Cloud Build
   - Artifact Registry
   - Secret Manager
   - IAM service-account configuration
2. Reserve the secondary Hosting site:

   ```powershell
   npx -y firebase-tools@latest hosting:sites:create pawtner-tw `
     --project pawtner-app-2026
   ```

3. Apply a stable deployment target:

   ```powershell
   npx -y firebase-tools@latest target:apply hosting production pawtner-tw `
     --project pawtner-app-2026
   ```

Expected result:

- `.firebaserc` maps the `production` Hosting target to the `pawtner-tw` site.
- `https://pawtner-tw.web.app` and `https://pawtner-tw.firebaseapp.com` are reserved
  for this project, although they may return a Firebase 404 until deployment.

## Phase 1: Capture the current baseline

Before deploying the replacement:

1. Record the currently deployed App Hosting build and Cloud Run revision.
2. Run the existing smoke suite against the App Hosting URL.
3. Record expected results for:
   - Home and explore SSR pages
   - Static and optimized images
   - `GET /api/health`
   - Firebase login and logout
   - Authenticated API routes
   - Adoption application creation
   - Payment webhook handling
   - Government pet synchronization
4. Capture baseline latency, error rate, instance count, and application logs.
5. Confirm the old App Hosting endpoint will remain deployed for at least
   24 hours after production cutover.

Exit criteria:

- The current application is healthy.
- A known-good App Hosting build and URL are documented for rollback.

## Phase 2: Prepare the independent Cloud Run service

Create a new service named `pawtner-hosting-web` in `asia-east1`. Do not deploy
the migration image to the App Hosting-managed `pawtner-web` service.

Use the existing standalone Next.js container as the starting point:

- `next.config.ts` uses `output: "standalone"`.
- `Dockerfile` listens on port `8080`.
- The final image runs as a non-root user.

Configure the new service to match the current App Hosting runtime:

| Setting | Value |
| --- | --- |
| Region | `asia-east1` |
| CPU | `1` |
| Memory | `1 GiB` |
| Minimum instances | `0` |
| Maximum instances | `10` |
| Concurrency | `80` |
| Container port | `8080` |

Create a dedicated service account for the new Cloud Run service. Grant only
the permissions needed to read the selected Secret Manager secrets and use the
required Firebase services.

Cloud Run must accept requests forwarded by Firebase Hosting. Configure
invocation access according to the Firebase Hosting-to-Cloud Run integration
requirements, while keeping the direct Cloud Run URL out of user-facing links.

Exit criteria:

- A new Cloud Run service exists independently of App Hosting.
- A test revision starts successfully and passes `GET /api/health`.
- App Hosting deployments do not control or update the new service.

## Phase 3: Migrate build and runtime configuration

Use `apphosting.yaml` as the source inventory, but manage Cloud Run configuration
through the deployment pipeline and Secret Manager.

### Build-time public configuration

The following values must exist during `next build` because Next.js embeds
`NEXT_PUBLIC_*` values into the browser bundle:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FEATURE_FIREBASE_AUTH_ENABLED`
- `NEXT_PUBLIC_FEATURE_FIREBASE_AUTH_EMAIL_COHORT`, if used
- `FEATURE_GOVERNMENT_PETS_ENABLED`, if it changes the built client output

Update the Docker/Cloud Build flow so these values are explicitly supplied to
the builder stage. Supplying them only as Cloud Run runtime variables is not
sufficient.

Although Firebase API keys and Supabase anonymous keys are intentionally public
client configuration, they must still be restricted to the appropriate APIs and
origins where supported.

### Runtime configuration

Configure non-secret runtime values directly on the Cloud Run service:

- `NEXT_PUBLIC_SUPABASE_URL`
- Firebase project and web-app identifiers
- `FIREBASE_ADMIN_PROJECT_ID=pawtner-app-2026`
- Firebase authentication feature flags
- `FEATURE_AI_ENABLED`
- `FEATURE_COMMERCE_ENABLED`
- `FEATURE_GOVERNMENT_PETS_ENABLED`

Attach sensitive values from Secret Manager using pinned secret versions:

- `SUPABASE_SERVICE_ROLE_KEY`
- `MOA_SYNC_SECRET`
- `PAYMENT_WEBHOOK_SECRET`, when enabled
- `SENTRY_DSN`, when enabled

Prefer Application Default Credentials for Firebase Admin. Do not place a
service-account private key in the container or repository.

Exit criteria:

- The build fails clearly if required public build configuration is absent.
- The runtime starts without copying secret values into the image.
- `/api/health` and the restricted operations status endpoint report the
  expected configuration.

## Phase 4: Configure the `pawtner-tw` Hosting target

Update `firebase.json` so the Hosting configuration uses:

- Target: `production`
- Public directory: `public`
- Catch-all rewrite to Cloud Run service `pawtner-hosting-web`
- Region: `asia-east1`
- `pinTag: true`

Conceptual configuration:

```json
{
  "hosting": {
    "target": "production",
    "public": "public",
    "rewrites": [
      {
        "source": "**",
        "run": {
          "serviceId": "pawtner-hosting-web",
          "region": "asia-east1",
          "pinTag": true
        }
      }
    ]
  }
}
```

Keep the Hosting response priority in mind: exact files in `public/` are served
by Hosting before the Cloud Run rewrite is evaluated.

Exit criteria:

- Firebase CLI resolves `hosting:production` to site ID `pawtner-tw`.
- Hosting validation recognizes the Cloud Run service and region.
- The App Hosting configuration remains untouched for rollback.

## Phase 5: Preview and acceptance testing

Deploy a preview channel before updating the live Hosting channel:

```powershell
npx -y firebase-tools@latest hosting:channel:deploy app-hosting-migration `
  --only production `
  --project pawtner-app-2026
```

Run the following acceptance checks through the preview URL:

- Home, explore, pet detail, and authenticated pages render correctly.
- Next.js SSR and route handlers receive the original host, path, and query.
- Static files and `/_next/*` assets load without 404 or cache mismatch.
- Image optimization works for Supabase and government pet images.
- `GET /api/health` identifies the runtime as Cloud Run.
- Firebase email/password login, token verification, session cookies, and
  logout work through the Hosting hostname.
- Supabase access works for anonymous and authenticated requests.
- Adoption application creation works.
- Payment and synchronization endpoints reject missing or invalid secrets.
- Supported non-GET methods pass through the Hosting rewrite.
- Logs contain no leaked tokens, keys, or service-role credentials.

Also verify or update:

- Firebase Authentication authorized domains:
  - `pawtner-tw.web.app`
  - `pawtner-tw.firebaseapp.com`
- Supabase authentication redirect allowlists.
- OAuth callback URLs, if any.
- Payment webhook destinations.
- Email links and application base URLs.
- CORS and CSRF origin checks.
- Monitoring and uptime-check URLs.

Exit criteria:

- All acceptance checks pass on the preview channel.
- No unresolved authentication, callback, cookie, or caching differences remain.

## Phase 6: Production cutover

1. Deploy the approved Cloud Run image and record its immutable image digest and
   revision name.
2. Deploy the Hosting live channel:

   ```powershell
   npx -y firebase-tools@latest deploy `
     --only hosting:production `
     --project pawtner-app-2026
   ```

3. Confirm both Firebase-provisioned URLs:
   - `https://pawtner-tw.web.app`
   - `https://pawtner-tw.firebaseapp.com`
4. Treat `https://pawtner-tw.web.app` as the canonical application URL.
5. Run the full smoke suite against the canonical URL.
6. Update external integrations and user-facing links only after the smoke
   suite passes.

Exit criteria:

- Both Hosting URLs serve the approved Cloud Run revision.
- Authentication and critical write paths work in production.
- Monitoring, webhook delivery, and logs are healthy.

## Phase 7: Observation and cleanup

For at least 24 hours after cutover:

- Monitor Hosting and Cloud Run 4xx/5xx responses.
- Monitor Cloud Run cold starts, latency, concurrency, and instance count.
- Monitor Firebase authentication failures.
- Monitor Supabase errors and connection usage.
- Confirm payment webhook delivery and government pet synchronization.
- Keep App Hosting deployed and do not delete its backend or URL.

After the observation window:

1. Confirm the product owner accepts the new production URL.
2. Disable automated App Hosting deployments.
3. Remove the `apphosting` section from `firebase.json` and archive or remove
   `apphosting.yaml` in a separate, reviewed cleanup change.
4. Delete the App Hosting backend only after a longer rollback window and
   explicit approval.
5. Update hosting documentation and operational runbooks.

## Rollback plan

Rollback is required if authentication, critical writes, webhooks, or error-rate
thresholds fail after cutover.

1. Stop external link and callback updates.
2. Roll back the Firebase Hosting release to the previous known-good release, or
   temporarily redirect users to:
   `https://pawtner-web--pawtner-app-2026.asia-east1.hosted.app`
3. Restore external webhook and callback URLs to the App Hosting endpoint.
4. Keep Supabase data and authentication mappings unchanged.
5. If only the new Cloud Run revision is faulty, route 100% of Cloud Run traffic
   to its previous healthy revision and redeploy the pinned Hosting release.
6. Record the incident and do not resume cutover until the failed acceptance
   criterion is corrected.

Rollback is considered complete when the App Hosting endpoint passes the smoke
suite and production integrations again target the known-good endpoint.

## Final acceptance checklist

- [x] Firebase accepted secondary Hosting site ID `pawtner-tw`.
- [x] `production` target maps to `pawtner-tw`.
- [x] New Cloud Run service is independent of App Hosting.
- [x] Build-time `NEXT_PUBLIC_*` configuration is reproducible.
- [x] Runtime secrets are sourced from Secret Manager.
- [x] Preview-channel HTTP acceptance tests pass.
- [ ] Firebase Auth and Supabase allowlists include the new domains.
- [x] Production Hosting deployment passes the HTTP smoke suite.
- [ ] Monitoring remains healthy for at least 24 hours.
- [x] Rollback endpoint remains deployed and returns HTTP 200.
- [ ] App Hosting cleanup has separate approval.
