// Server-side Supabase Storage checks for the observations pipeline. The API is the auth
// boundary (R3): before we spend an OpenAI call on a capture, prove the referenced object
// actually exists under the caller's prefix, is an image, and is a sane size — never trust
// a client-supplied path. Real identification then runs against a short-lived signed URL,
// not a raw path.

import { supabaseAdmin } from "./supabaseAdmin";
import { errors } from "./errors";

export const OBSERVATIONS_BUCKET = "observations";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const SIGNED_URL_TTL_SECONDS = 120;

/**
 * Verify the object at `imagePath` exists in the observations bucket, is an image, and is
 * within the size limit. Throws a validation error otherwise. Caller must have already
 * checked that `imagePath` is under the caller's own prefix.
 */
export async function assertObservationImage(imagePath: string): Promise<void> {
  const slash = imagePath.lastIndexOf("/");
  const dir = slash >= 0 ? imagePath.slice(0, slash) : "";
  const name = slash >= 0 ? imagePath.slice(slash + 1) : imagePath;

  const { data, error } = await supabaseAdmin()
    .storage.from(OBSERVATIONS_BUCKET)
    .list(dir, { limit: 1, search: name });

  if (error) {
    throw errors.validation("Could not verify the uploaded image");
  }
  const object = data?.find((o) => o.name === name);
  if (!object) {
    throw errors.validation("No uploaded image found at imagePath");
  }
  const mimetype = (object.metadata?.mimetype as string | undefined) ?? "";
  const size = (object.metadata?.size as number | undefined) ?? 0;
  if (!mimetype.startsWith("image/")) {
    throw errors.validation("Uploaded file is not an image");
  }
  if (size <= 0 || size > MAX_IMAGE_BYTES) {
    throw errors.validation("Uploaded image is empty or exceeds the size limit");
  }
}

// Default (identify) TTL is short; feed/post browsing uses a longer one.
export const POST_IMAGE_TTL_SECONDS = 60 * 60; // 1 hour

/** Short-lived signed URL the identifier (OpenAI) can fetch. Throws if the object is missing. */
export async function createSignedImageUrl(
  imagePath: string,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const { data, error } = await supabaseAdmin()
    .storage.from(OBSERVATIONS_BUCKET)
    .createSignedUrl(imagePath, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw errors.validation("Could not access the uploaded image");
  }
  return data.signedUrl;
}

/**
 * Best-effort signed URL for displaying post/feed images: returns null instead of throwing
 * when the object is missing or signing fails, so one bad image never breaks a whole feed page.
 */
export async function trySignImageUrl(
  imagePath: string | null,
  ttlSeconds: number = POST_IMAGE_TTL_SECONDS,
): Promise<string | null> {
  if (!imagePath) return null;
  try {
    const { data } = await supabaseAdmin()
      .storage.from(OBSERVATIONS_BUCKET)
      .createSignedUrl(imagePath, ttlSeconds);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
