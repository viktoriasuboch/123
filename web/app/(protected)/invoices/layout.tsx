import { requireAdmin } from "@/lib/auth";

/**
 * Invoices is admin-only. This segment layout gates every /invoices route
 * (including /invoices/projects/[id]) on the server, so a projects_viewer
 * is redirected to /projects even via a direct URL — hiding the nav link
 * alone isn't access control.
 */
export default async function InvoicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
