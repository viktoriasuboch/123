import { createAuthServerSupabase } from "@/lib/supabase/server";

export async function POST() {
  const sb = await createAuthServerSupabase();
  await sb.auth.signOut();
  // Relative Location: browser resolves against its own public URL,
  // which is important behind Render's reverse proxy.
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
