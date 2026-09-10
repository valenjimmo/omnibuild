import Workspace from "@/components/workspace";
export default async function Portal({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  return <Workspace portalSlug={organizationSlug} />;
}
