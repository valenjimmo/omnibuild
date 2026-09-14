export const contractorName = process.env.NEXT_PUBLIC_CONTRACTOR_NAME || "Westwood ADU";
export const contractorSlug = process.env.NEXT_PUBLIC_CONTRACTOR_SLUG || "westwood-adu";
const portalBase = process.env.NEXT_PUBLIC_OMNIBUILD_PORTAL_URL || "https://omnibuild-liard.vercel.app/portal/westwood-adu";

export function portalHref() {
  const url = new URL(portalBase);
  url.searchParams.set("from", "website");
  url.searchParams.set("contractor", contractorSlug);
  return url.toString();
}
