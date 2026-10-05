import { afterEach, expect, it, vi } from "vitest";
import { acceptInvitation, previewInvitation } from "./invitations-client";
vi.mock("@epl-fellows-platform/env/web", () => ({ env: { NEXT_PUBLIC_SERVER_URL: "http://localhost:4300" } }));
afterEach(() => vi.unstubAllGlobals());
it("reports rate limits even when the response is not JSON", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Too many requests", { status: 429 })));
  await expect(previewInvitation("a".repeat(43))).rejects.toMatchObject({ status: 429, message: expect.stringContaining("wait a minute") });
});
it("reports expired authentication and sends credentials without browser caching", async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ message: "Sign in before accepting." }, { status: 401 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(acceptInvitation({ token: "a".repeat(43) })).rejects.toMatchObject({ status: 401 });
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ credentials: "include", cache: "no-store", method: "POST" });
});
