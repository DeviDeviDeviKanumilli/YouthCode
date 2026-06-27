// Standard error envelope + helpers (API_CONTRACT §conventions).
// All routes return { error: { code, message } } with the matching HTTP status.

import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const errors = {
  validation: (msg = "Invalid request") => new ApiError(400, "VALIDATION", msg),
  unauthenticated: (msg = "Authentication required") => new ApiError(401, "UNAUTHENTICATED", msg),
  forbidden: (msg = "Forbidden") => new ApiError(403, "FORBIDDEN", msg),
  notFound: (msg = "Not found") => new ApiError(404, "NOT_FOUND", msg),
  conflict: (msg = "Conflict") => new ApiError(409, "CONFLICT", msg),
  quota: (msg = "Quota reached") => new ApiError(429, "QUOTA", msg),
  server: (msg = "Internal server error") => new ApiError(500, "SERVER", msg),
};

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status },
    );
  }
  console.error("[api] unhandled error:", err);
  return NextResponse.json(
    { error: { code: "SERVER", message: "Internal server error" } },
    { status: 500 },
  );
}
