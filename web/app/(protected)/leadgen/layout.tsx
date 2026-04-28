import { requireSection } from "@/lib/auth";
import { LeadgenTabs } from "@/components/leadgen/leadgen-tabs";
import { LeadgenRealtime } from "@/components/leadgen/leadgen-realtime";
import { LeadgenHeader } from "@/components/leadgen/leadgen-header";

export default async function LeadgenSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("leadgen");
  return (
    <>
      <LeadgenRealtime />
      <LeadgenHeader />
      <LeadgenTabs />
      {children}
    </>
  );
}
