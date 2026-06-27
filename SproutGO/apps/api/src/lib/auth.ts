// JWT verification — the real authorization boundary (TECH_RISKS R3, SECURITY_AND_PRIVACY).
// The mobile app sends the Supabase session JWT as `Authorization: Bearer <token>`.
// We verify it and resolve the caller's userId. Writes ALWAYS use this id — never a
// client-supplied userId.
//
// Supabase projects now sign end-user tokens with an ASYMMETRIC key (ES256/RS256) exposed
// via the project's JWKS endpoint; the legacy symmetric HS256 "JWT secret" is no longer used
// for new session tokens. We therefore verify ES256/RS256 against the JWKS and fall back to
// the HS256 secret for any legacy/symmetric token, so both signing modes are accepted.

import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader, type JWTVerifyGetKey } from "jose";
import { env } from "./env";
import { errors } from "./errors";

export interface AuthContext {
  userId: string;
}

// Lazily built once and cached (the resolver fetches + caches the JWKS and refetches on
// key rotation). Built lazily because env getters throw if accessed at import time before
// env is populated.
let jwks: JWTVerifyGetKey | undefined;
function getJwks(): JWTVerifyGetKey {
  if (!jwks) {
    const base = env.supabaseUrl.replace(/\/$/, "");
    jwks = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
  }
  return jwks;
}

/** Verify the Bearer token on a request and return the authenticated userId. */
export async function requireAuth(req: Request): Promise<AuthContext> {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw errors.unauthenticated("Missing Bearer token");
  }
  const token = header.slice("Bearer ".length).trim();

  let payload: Record<string, unknown>;
  try {
    // Defense-in-depth (Prisma bypasses RLS): constrain the issuer and audience to this
    // Supabase project's end-user tokens, not just a valid signature. Normalize a possible
    // trailing slash so SUPABASE_URL="https://x.supabase.co/" still matches the real
    // issuer "https://x.supabase.co/auth/v1".
    const options = {
      issuer: `${env.supabaseUrl.replace(/\/$/, "")}/auth/v1`,
      audience: "authenticated",
    };

    // Pick the verification key by the token's signing algorithm: symmetric HS* uses the
    // shared secret; everything else (ES256/RS256) verifies against the JWKS public keys.
    const alg = decodeProtectedHeader(token).alg ?? "";
    const verified = alg.startsWith("HS")
      ? await jwtVerify(token, new TextEncoder().encode(env.supabaseJwtSecret), options)
      : await jwtVerify(token, getJwks(), options);
    payload = verified.payload as Record<string, unknown>;
  } catch {
    throw errors.unauthenticated("Invalid or expired token");
  }

  // Reject service-role / non-end-user tokens even if signed with a valid key.
  if (payload.role !== "authenticated") {
    throw errors.unauthenticated("Token is not an authenticated end-user token");
  }

  // Supabase puts the auth user id in `sub`.
  const userId = typeof payload.sub === "string" ? payload.sub : null;
  if (!userId) {
    throw errors.unauthenticated("Token missing subject");
  }
  return { userId };
}
