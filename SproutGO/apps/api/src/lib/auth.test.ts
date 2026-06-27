import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT } from "jose";
import { requireAuth } from "./auth";

// requireAuth is the real authorization boundary. Beyond signature it must constrain the
// issuer, audience, and role so a service-role token (or another project's token) can't
// be replayed as an end user.
const SECRET = "test-jwt-secret-please-ignore-1234567890";
const SUPABASE_URL = "https://proj.supabase.co";
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const key = new TextEncoder().encode(SECRET);

beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = SECRET;
  process.env.SUPABASE_URL = SUPABASE_URL;
});

function sign(claims: Record<string, unknown>, opts?: { iss?: string; aud?: string }) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(opts?.iss ?? ISSUER)
    .setAudience(opts?.aud ?? "authenticated")
    .setExpirationTime("1h")
    .sign(key);
}

const reqWith = (token: string) =>
  new Request("http://localhost/api/v1/x", { headers: { Authorization: `Bearer ${token}` } });

describe("requireAuth", () => {
  it("accepts a well-formed end-user token and returns the sub", async () => {
    const token = await sign({ sub: "user-1", role: "authenticated" });
    await expect(requireAuth(reqWith(token))).resolves.toEqual({ userId: "user-1" });
  });

  it("rejects a missing Bearer header", async () => {
    await expect(requireAuth(new Request("http://localhost/x"))).rejects.toThrow();
  });

  it("rejects a wrong issuer", async () => {
    const token = await sign({ sub: "user-1", role: "authenticated" }, { iss: "https://evil.example/auth/v1" });
    await expect(requireAuth(reqWith(token))).rejects.toThrow();
  });

  it("rejects a wrong audience", async () => {
    const token = await sign({ sub: "user-1", role: "authenticated" }, { aud: "anon" });
    await expect(requireAuth(reqWith(token))).rejects.toThrow();
  });

  it("rejects a non-authenticated role (e.g. service_role)", async () => {
    const token = await sign({ sub: "svc", role: "service_role" });
    await expect(requireAuth(reqWith(token))).rejects.toThrow();
  });

  it("rejects a token signed with the wrong secret", async () => {
    const token = await new SignJWT({ sub: "user-1", role: "authenticated" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(ISSUER)
      .setAudience("authenticated")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("a-totally-different-secret-0000000000"));
    await expect(requireAuth(reqWith(token))).rejects.toThrow();
  });
});
