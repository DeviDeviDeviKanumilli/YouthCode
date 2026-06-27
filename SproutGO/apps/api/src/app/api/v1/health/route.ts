// GET /api/v1/health — unauthenticated liveness check.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  return NextResponse.json({ status: "ok", service: "sproutgo-api", version: "v1" });
}
