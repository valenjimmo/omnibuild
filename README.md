# Omnibuild

Omnibuild is the platform company. Its hub manages contractor clients such as Westwood ADU; each contractor has its own homeowner/project workspace and communications inbox. Next.js 16, React 19, TypeScript, Supabase Auth/PostgreSQL/Storage, and PostgreSQL RLS. The UI uses custom responsive CSS and Lucide icons; Tailwind/shadcn are not dependencies.

## Run the demo

Install Node.js 22. Then:

```sh
npm ci
npm run dev
```

Open http://localhost:3000 for the **Omnibuild hub**. Open `/workspace/westwood-adu` for the contractor workspace or `/demo/contractor/westwood-adu` for the linked marketing-website demonstration. Without Supabase environment variables, the app explicitly runs in **Demo mode**, with sample projects and browser-local persistence. The homeowner demo is at `/portal/westwood-adu`. Demo identities and localStorage are not an authentication boundary. Files in this mode are limited to 2 MB and stored in this browser. Clear `omnibuild-demo-v1` from localStorage to reset.

On the machine used to build this project, a temporary Node installation is available at `/tmp/node-v22.23.2-darwin-arm64/bin`. Until Node is installed permanently, use:

```sh
PATH=/tmp/node-v22.23.2-darwin-arm64/bin:$PATH npm run dev
```

## Connect Supabase

1. Create a hosted Supabase project. Copy `.env.example` to `.env.local` and set the public project URL and anon key. Set the server-only service role key for invitations. Never prefix that key with `NEXT_PUBLIC_`.
2. Install the Supabase CLI. Run `supabase login`, `supabase link --project-ref YOUR_PROJECT_REF`, then `supabase db push`. Both migrations are versioned in `supabase/migrations/`.
3. Set Supabase Auth's Site URL to your app origin and allow `/auth/callback` and `/auth/confirm` URLs on that origin. Set `NEXT_PUBLIC_SITE_URL` to the same origin.
4. Configure the **Invite user** email template link as `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`. This verifies the invitation on the server and opens the password setup screen. Configure **Confirm signup** with `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`. Configure **Reset password** with the same pattern and `type=recovery` if enabling recovery email workflows.
5. Configure an email provider in Supabase for real invitations. The invite endpoint handles delivery failures and removes unsuccessful invitation records. Existing Supabase accounts receive a magic sign-in link instead; configure the **Magic Link** template as `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
6. Restart the app. Sign up, confirm email, and provision your Omnibuild administrator using [the platform setup guide](docs/PLATFORM_AND_WHATSAPP.md). Create contractor companies from the hub and invite their owners. Add a client, create a project, and invite the client. Owners can invite staff in Settings. Invitations expire after seven days and are accepted only by the matching authenticated email.
7. Copy the portal link from Settings and add it to the contractor's existing website.

No sample records are inserted into a connected Supabase project. In connected mode all CRUD uses the signed-in user's JWT and is authorized by RLS. The privileged key is used only for email delivery after owner authorization.

## Included workflows

- Platform-admin contractor creation, owner invitations, contractor login/logout; company name and logo URL; organization switching for users with multiple memberships.
- Owner/staff roles and owner-only team/client invitations.
- Create, edit, archive, restore, and invite clients. Archived clients lose database/file access.
- Create and assign projects; edit status, address, overview, and target date.
- Milestone creation and completion, private/shared updates, private uploads with explicit client sharing.
- PDF, text, JPEG, PNG, and WebP files up to 10 MB in private Supabase Storage, with short-lived download URLs.
- Project conversations, editable message templates, suggested replies, and custom text replies.
- Responsive homeowner portal at `/portal/[organizationSlug]`.

The home illustration is a repository-owned SVG concept illustration, not an actual project photograph. All demo client information is fictional.

## Verify

```sh
npm run lint
npm test
npm run build
```

`npm test` executes the migrations and 67 security assertions in embedded PostgreSQL (PGlite), plus input-validation tests. Auth and Storage infrastructure tables are minimal test fixtures, not the hosted Supabase services. The same SQL suite uses pgTAP against real local Supabase:

```sh
supabase start       # requires Docker
supabase db reset
npm run test:security
```

The platform/WhatsApp architecture, QR behavior, and deployment steps are documented in [Platform and WhatsApp](docs/PLATFORM_AND_WHATSAPP.md). Live WhatsApp sending and sent-message sync are not implemented; QR codes open WhatsApp, and verified inbound webhooks populate the connected inquiry inbox.

Browser tests require the demo app running at `http://127.0.0.1:3000` and Chrome installed:

```sh
npm run test:e2e
```

Set `PLAYWRIGHT_CHANNEL` to a supported installed browser channel if needed. Tests cover contractor CRUD, updates/files/messages, demo persistence, homeowner restrictions, and mobile navigation. They do not substitute for connected Auth/email/Storage integration testing.

## Deploy

Import the repository into Vercel as a Next.js project. Add the environment variables to the intended environment, apply the migrations to that environment's Supabase project, and configure Auth URLs/email templates for the deployed origin. Build with `npm run build`. This workspace has not been deployed and no hosted Supabase project has been modified.

Read [Architecture](docs/ARCHITECTURE.md), [Database](docs/DATABASE.md), [Security](docs/SECURITY.md), and [MVP plan](docs/MVP_PLAN.md) for the implementation boundaries and remaining environment verification.
