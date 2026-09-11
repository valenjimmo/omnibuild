import Workspace from "@/components/workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;
  return <Workspace organizationSlug={organizationSlug} />;
}
