import { requireSection } from "@/lib/auth";
import { ProjectsRealtime } from "@/components/projects/projects-realtime";

export default async function ProjectsSegmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSection("projects");
  return (
    <>
      <ProjectsRealtime />
      {children}
    </>
  );
}
