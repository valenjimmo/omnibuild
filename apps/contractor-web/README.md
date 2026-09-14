# Westwood ADU contractor website

This is a standalone, fictional marketing site for a Bay Area contractor. The OmniBuild platform stays at the repository root and keeps its existing Vercel Root Directory. Moving it into `apps/platform` would add risk to its existing routing and deployment for no benefit to this test. This app has its own dependencies and deployment. It does not import files outside its directory, so Vercel's **Include files outside the Root Directory** setting is unnecessary.

The **View project status** links in the header and hero navigate in the **same tab** to the contractor's OmniBuild portal. The URL is built from these public build-time variables:

```bash
NEXT_PUBLIC_OMNIBUILD_PORTAL_URL=https://omnibuild-liard.vercel.app/portal/westwood-adu
NEXT_PUBLIC_CONTRACTOR_SLUG=westwood-adu
NEXT_PUBLIC_CONTRACTOR_NAME=Westwood ADU
```

The resulting default CTA is `https://omnibuild-liard.vercel.app/portal/westwood-adu?from=website&contractor=westwood-adu`. An existing query string on the portal URL is preserved. These are public configuration values, not secrets. Until Vercel is configured, the app uses these defaults.

## Local development

In one terminal, from the repository root:

```bash
npm install
npm run dev
```

In a second terminal:

```bash
cd apps/contractor-web
npm install
npm run dev
```

The platform uses `http://localhost:3000`; the demo site uses `http://localhost:3001`. To test a fully local hop, create `apps/contractor-web/.env.local` with `NEXT_PUBLIC_OMNIBUILD_PORTAL_URL=http://localhost:3000/portal/westwood-adu` plus the slug and name above, then restart the demo server. Open `http://localhost:3001`, click **View project status**, and confirm the address is `http://localhost:3000/portal/westwood-adu?from=website&contractor=westwood-adu`. Without the local override, the CTA opens the live OmniBuild portal instead.

Run `npm run lint` and `npm run build` from this directory before deployment.

## Vercel: second project from the same repository

1. Push the branch to GitHub.
2. In Vercel, choose **Add New Project** and import the **same GitHub repository** that hosts OmniBuild.
3. Name the new project `omnibuild-contractor-web`.
4. Set **Root Directory** to `apps/contractor-web`. Leave the existing OmniBuild project's Root Directory unchanged.
5. Select the **Next.js** framework preset. Keep the default build command (`npm run build`) and install command (`npm install`).
6. Set `NEXT_PUBLIC_OMNIBUILD_PORTAL_URL`, `NEXT_PUBLIC_CONTRACTOR_SLUG`, and `NEXT_PUBLIC_CONTRACTOR_NAME` to the values shown above for Production and Preview environments.
7. Deploy and copy the assigned production URL, such as `https://omnibuild-contractor-web.vercel.app` (the actual URL may differ).
8. In the **existing** OmniBuild Vercel project, set `NEXT_PUBLIC_CONTRACTOR_WEBSITE_URL_WESTWOOD` to that URL for the environments you use, then redeploy the existing project. If this variable is empty, the HQ link still opens `/demo/contractor/westwood-adu`.
9. In HQ, open Westwood ADU → **Website demo**. Confirm it opens the new origin, then click **View project status** and confirm the OmniBuild portal URL includes `from=website` and `contractor=westwood-adu`.

Vercel creates unique Preview URLs for branch and pull request deployments, typically `https://omnibuild-contractor-web-<branch-or-hash>-<scope>.vercel.app`; copy the exact URL from the Vercel deployment page. A custom domain can later be added under the new project's **Settings → Domains** without changing the app code; update the existing project's website URL variable after that change.

For build efficiency, an optional **Ignored Build Step** can skip this project's build when a commit does not touch `apps/contractor-web/**` (or a future shared config package). Configure and test that rule in the new Vercel project only; it is not needed for the initial deployment.

## How to verify on Vercel

- [ ] Existing OmniBuild HQ, workspace, in-app website demo, and homeowner portal still open.
- [ ] Westwood's **Website demo** in HQ opens the new contractor-web origin.
- [ ] The new site's header and hero CTA land on the OmniBuild portal with `from=website&contractor=westwood-adu`.
- [ ] The new site's `/projects` page and mobile layout render correctly.
