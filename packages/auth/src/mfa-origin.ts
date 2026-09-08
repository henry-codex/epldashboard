/** Browser GET requests may omit Origin when the frontend and API share a host. */
export function trustedSecurityOrigin(request: Request, frontendURL: string, authURL: string) {
  const expected = new URL(frontendURL).origin;
  const origin = request.headers.get("origin");
  if (origin !== null) return origin === expected;
  if (request.method !== "GET" || new URL(authURL).origin !== expected) return false;
  if (request.headers.get("sec-fetch-site") === "same-origin") return true;
  try { return new URL(request.headers.get("referer") ?? "").origin === expected; }
  catch { return false; }
}
