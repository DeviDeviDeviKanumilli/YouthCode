// Uploads a captured photo to Supabase Storage and returns the object path that the
// backend expects as `imagePath`. The path is namespaced under the authenticated user's
// id (`<userId>/<uuid>.jpg`) — the API enforces that prefix as its auth guard, so this
// must match (R3: the API is the real boundary, never trust the client to scope itself).

import { supabase } from "./supabase";

const BUCKET = "observations";

function uuid(): string {
  // RN has crypto.randomUUID on Hermes 0.74; fall back to a timestamp-based id otherwise.
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function uploadObservationPhoto(localUri: string, userId: string): Promise<string> {
  const path = `${userId}/${uuid()}.jpg`;

  // Read the local file URI as binary. fetch().arrayBuffer() works for file:// URIs in RN.
  const res = await fetch(localUri);
  const bytes = await res.arrayBuffer();

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }
  return path;
}
