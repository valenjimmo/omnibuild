import ContractorSite from "@/components/contractor-site";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ContractorSite slug={slug} />;
}
