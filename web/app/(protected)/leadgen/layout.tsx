import { requireSection } from "@/lib/auth";

export default async function LeadgenSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("leadgen");
  return <>{children}</>;
}
