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

/**
 * After a deploy, the client bundle the user is still running references
 * Server Action IDs that the new server doesn't recognise. The error
 * looks like `Server Action "<hash>" was not found on the server`.
 * Detecting it lets the client recover by reloading instead of showing
 * a scary toast.
 */
export function isStaleServerActionError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const msg = (err as { message?: unknown }).message;
  if (typeof msg !== "string") return false;
  return /Server Action ".*" was not found on the server/i.test(msg);
}
