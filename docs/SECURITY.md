# Security model

Authorization is enforced by PostgreSQL RLS and Storage policies. UI filtering and portal slugs are convenience features, not trust boundaries. All public application tables enable RLS; anonymous users receive no row policies. The browser only receives the public Supabase URL/anon key and a user session.

| Actor     | Allowed                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Owner     | Own-company staff workflows, profile updates, issue invitations                                                                     |
| Staff     | Own-company clients, projects, milestones, updates, file metadata/storage, templates, messages                                      |
| Homeowner | Their active client record, assigned projects/milestones, client-visible updates/files, project messages; may send messages as self |
| Anonymous | Authentication UI; no tenant records                                                                                                |

A homeowner cannot see other clients in the same company. An archived client's project, update, document, photo, message, and new file-download access is removed. Existing signed download URLs remain valid until their 60-second expiry.

Composite foreign keys stop cross-tenant assignment. Update triggers prohibit tenant/record identity changes. Message inserts require `sender_id = auth.uid()`. No authenticated insert/update policies grant arbitrary membership changes. Owners invite staff through the server, and email-confirmed invitation acceptance binds client accounts. Invitation payloads are strict-schema validated, origin checked, authenticated, and checked against owner membership before using the server-only privileged email API. The selected client must belong to that organization, be active, and have the invitation email.

Storage is private. Writes require an existing project in the uploader's company and exactly three path segments. Reads require a document metadata row visible under its RLS policy. File MIME allowlisting excludes HTML and SVG, and the bucket enforces a 10 MB limit. Metadata starts private in the UI and can be explicitly shared. Files are downloaded through 60-second signed URLs.

The owner is trusted to manage access within their company. Staff are trusted to manage project/client records but cannot grant themselves owner permissions or bind a client directly to an auth user. Security-definer helpers are narrow, have no dynamic user-controlled SQL, use fully qualified names, and have restricted execution grants.

## Evidence and boundaries

The automated SQL suite tests 47 assertions across tenant tables, homeowner restrictions, cross-tenant client assignment, sender spoofing, tenant movement, client identity payload manipulation, storage path traversal/mismatches, valid uploads/replies, staff escalation, and archive revocation. `npm test` executes this suite on PGlite PostgreSQL with minimal Auth/Storage fixture schemas and assertion helpers. `supabase test db` executes the same suite using pgTAP and the real local service schema.

The embedded tests exercise real PostgreSQL RLS, foreign keys, roles, and triggers. They do not verify hosted email delivery, Supabase HTTP endpoints, JWT issuance, object byte storage, or Vercel routing. Run the full local Supabase suite and a hosted two-tenant acceptance test before production use. No credentials were provided during implementation, so those connected checks remain environment work.

User content is rendered as React text, never raw HTML. Secrets are excluded from Git. The app has no billing, public file buckets, or privileged browser database client. Authentication uses Supabase SSR cookies and server token validation. Sessions are refreshed by the Next.js proxy.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database testing](https://supabase.com/docs/guides/database/testing), and [server-side auth](https://supabase.com/docs/guides/auth/server-side).
