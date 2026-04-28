import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SectionId = "leadgen" | "projects";

export type SessionData = {
  sections?: SectionId[];
};

const SESSION_COOKIE = "lb_session";

function options(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_SECRET env var is missing or too short (need 32+ chars)",
    );
  }
  return {
    password,
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  };
}

export async function getSession() {
  const store = await cookies();
  return getIronSession<SessionData>(store, options());
}

export async function destroySession() {
  const session = await getSession();
  session.destroy();
}
