import { destroySession } from "@/lib/session";

export async function POST() {
  await destroySession();
  // Relative Location lets the browser resolve against the public URL it
  // requested, which works behind reverse proxies (Render) that mask the
  // origin in request.url.
  return new Response(null, { status: 303, headers: { Location: "/" } });
}
