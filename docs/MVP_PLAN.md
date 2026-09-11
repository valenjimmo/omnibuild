# Scope update: platform hub and WhatsApp demonstration

The user's follow-up expands the MVP: Omnibuild manages contractor clients, and a fictional contractor marketing website links to their Omnibuild homeowner portal. Basic WhatsApp inquiries, downloadable QR codes, and a verified inbound-webhook integration are now included. A full sales CRM, outbound WhatsApp automation, and Meta account onboarding remain outside this implementation. See [Platform and WhatsApp](PLATFORM_AND_WHATSAPP.md).

# MVP implementation and acceptance

## Implemented

- Shared multi-tenant schema, composite relationships, RLS, private file bucket, immutable tenant identities.
- Account signup/login/logout, email confirmation and invitation password setup, atomic company creation, owner/staff roles.
- Company profile/name/logo URL and copyable route-based client portal link.
- Client create/edit/archive/restore and invitation delivery endpoint.
- Project create/assign/edit/status/overview/target date and milestone creation/completion.
- Internal versus client-visible updates, document/photo uploads and sharing, signed downloads.
- Project messages, editable templates, suggested replies, and custom responses.
- Contractor overview, project cards, client list, message center, files, templates, settings, and responsive homeowner portal.
- Explicit browser-persistent demo for exploring without hosted credentials.
- Database security, payload/file validation, and browser workflow tests; architecture/database/security/setup documentation.

## Before hosted launch

1. Configure Supabase/Vercel environment variables and deploy migrations.
2. Configure Auth redirect URLs, invitation/confirmation email templates, and an email delivery provider.
3. Run the pgTAP suite on local Supabase (Docker required).
4. Exercise two real organizations with owners/staff/homeowners: authenticate, invite, accept, upload/share/download, and attempt cross-tenant requests through the Supabase APIs.
5. Confirm production email delivery and inspect configured backup/retention settings in the hosting accounts.

## MVP implementation choices

The UI uses custom CSS instead of Tailwind/shadcn. The logo is configured by URL. Project visuals are illustrative, while user-uploaded photos are accessible in project files. A project has one client record; multiple family members can share that record's contact name, but only one auth account is associated with it. Conversations refresh on load/write. There is no pagination, realtime subscription, self-service password-reset form, or staff removal UI in this implementation. Demo mode does not send invitations.

## Explicitly excluded

Billing, subscriptions, Stripe, estimating, accounting, payroll, sales CRM, subcontractor scheduling, permitting/city APIs, signatures/DocuSign, advanced analytics, AI chatbots, SMS/voice, QuickBooks, translations, native mobile apps, WordPress plugins, website builders, iframes, custom domains, self-hosted Supabase, per-client deployments, and microservices.
