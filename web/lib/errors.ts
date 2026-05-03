/**
 * `redirect()` and `notFound()` in Next.js work by throwing special
 * "errors" with a `digest` field that starts with NEXT_REDIRECT /
 * NEXT_NOT_FOUND. A try/catch around a Server Action call must re-throw
 * these so the navigation/redirect actually applies. Otherwise the user
 * sees something like `toast.error("Не сохранилось: NEXT_REDIRECT")`
 * and the redirect never happens.
 */
export function isRedirectError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const digest = (err as { digest?: unknown }).digest;
  if (typeof digest !== "string") return false;
  return digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND";
}
