import { requireSection } from "@/lib/auth";
import { LeadgenTabs } from "@/components/leadgen/leadgen-tabs";
import { LeadgenRealtime } from "@/components/leadgen/leadgen-realtime";

export default async function LeadgenSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("leadgen");
  return (
    <>
      <LeadgenRealtime />
      <h1 className="font-display text-4xl tracking-widest text-foreground mb-4">
        LEAD GENERATION
      </h1>
      <LeadgenTabs />
      {children}
    </>
  );
}
