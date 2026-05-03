import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "lb_session";

/**
 * Visiting "/" (the landing) clears the iron-session cookie. This makes
 * "go to landing" act as a soft logout — both Leadgen and Projects
 * sections are forgotten, so re-entering them requires the password
 * again.
 *
 * - The cookie is stripped from the *incoming* request headers so the
 *   landing page itself renders with no session (grey status dots,
 *   tile clicks go to /login).
 * - The cookie is also deleted on the *response* so the browser
 *   forgets it for subsequent navigations.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  const cookie = headers.get("cookie") ?? "";
  const cleaned = cookie
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith(`${SESSION_COOKIE}=`))
    .join("; ");
  if (cleaned) headers.set("cookie", cleaned);
  else headers.delete("cookie");

  const response = NextResponse.next({ request: { headers } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  matcher: "/",
};
