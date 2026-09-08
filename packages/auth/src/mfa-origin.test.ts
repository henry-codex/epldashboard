import { describe, expect, it } from "vitest";
import { trustedSecurityOrigin } from "./mfa-origin";
describe("security endpoint browser origins", () => {
  const url = "https://app.example.test";
  it("accepts same-origin GET fetches without weakening mutation checks", () => {
    expect(trustedSecurityOrigin(new Request(url + "/api/auth/passkey/generate-authenticate-options", { headers: { "sec-fetch-site": "same-origin" } }), url, url)).toBe(true);
    expect(trustedSecurityOrigin(new Request(url, { method: "POST", headers: { "sec-fetch-site": "same-origin" } }), url, url)).toBe(false);
    expect(trustedSecurityOrigin(new Request(url, { headers: { referer: url + "/login" } }), url, url)).toBe(true);
  });
  it("rejects cross-origin metadata and untrusted explicit origins", () => {
    expect(trustedSecurityOrigin(new Request(url, { headers: { origin: "https://evil.test", "sec-fetch-site": "same-origin" } }), url, url)).toBe(false);
    expect(trustedSecurityOrigin(new Request(url, { headers: { "sec-fetch-site": "cross-site", referer: "https://evil.test" } }), url, url)).toBe(false);
    expect(trustedSecurityOrigin(new Request(url), url, url)).toBe(false);
    expect(trustedSecurityOrigin(new Request("https://api.example.test", { headers: { "sec-fetch-site": "same-origin" } }), url, "https://api.example.test")).toBe(false);
  });
});
