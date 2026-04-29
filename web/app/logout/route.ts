import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/session";

export async function POST(request: NextRequest) {
  await destroySession();
  // Use the incoming request's origin so the app works on any host
  // (interexy.onrender.com, custom domain, etc.) without env updates.
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
