// Protocol fixtures for isolated tests. Private keys never leave test memory.
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
function cbor(value: string | number | Buffer | Map<unknown, unknown>): Buffer {
  const head = (major: number, count: number) => count < 24 ? Buffer.from([(major << 5) | count]) : count < 256 ? Buffer.from([(major << 5) | 24, count]) : Buffer.from([(major << 5) | 25, count >> 8, count & 255]);
  if (typeof value === "number") return head(value < 0 ? 1 : 0, value < 0 ? -1 - value : value);
  if (typeof value === "string") { const bytes = Buffer.from(value); return Buffer.concat([head(3, bytes.length), bytes]); }
  if (Buffer.isBuffer(value)) return Buffer.concat([head(2, value.length), value]);
  return Buffer.concat([head(5, value.size), ...[...value].flatMap(([key, item]) => [cbor(key as Parameters<typeof cbor>[0]), cbor(item as Parameters<typeof cbor>[0])])]);
}
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest();
export function virtualCredential(rpID = "localhost") {
  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = keys.publicKey.export({ format: "jwk" });
  const credential = randomBytes(32), id = credential.toString("base64url");
  let counter = 0, handle = "";
  const header = (flags: number) => { const count = Buffer.alloc(4); count.writeUInt32BE(counter); return Buffer.concat([hash(rpID), Buffer.from([flags]), count]); };
  return {
    id,
    register(challenge: string, userId: string, origin: string, uv = true): RegistrationResponseJSON {
      handle = userId;
      const cose = cbor(new Map<unknown, unknown>([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x!, "base64url")], [-3, Buffer.from(jwk.y!, "base64url")]]));
      const length = Buffer.alloc(2); length.writeUInt16BE(credential.length);
      const authData = Buffer.concat([header(uv ? 0x45 : 0x41), Buffer.alloc(16), length, credential, cose]);
      const attestation = cbor(new Map<unknown, unknown>([["fmt", "none"], ["attStmt", new Map()], ["authData", authData]]));
      return { id, rawId: id, type: "public-key", clientExtensionResults: {}, response: { attestationObject: attestation.toString("base64url"), clientDataJSON: Buffer.from(JSON.stringify({ type: "webauthn.create", challenge, origin, crossOrigin: false })).toString("base64url"), transports: ["internal"] } };
    },
    authenticate(challenge: string, origin: string, uv = true): AuthenticationResponseJSON {
      counter++;
      const client = Buffer.from(JSON.stringify({ type: "webauthn.get", challenge, origin, crossOrigin: false }));
      const data = header(uv ? 0x05 : 0x01);
      return { id, rawId: id, type: "public-key", clientExtensionResults: {}, response: { clientDataJSON: client.toString("base64url"), authenticatorData: data.toString("base64url"), signature: sign("sha256", Buffer.concat([data, hash(client)]), keys.privateKey).toString("base64url"), userHandle: handle } };
    },
  };
}
