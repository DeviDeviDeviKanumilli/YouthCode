// Typed access to backend env vars. Throws early if a required secret is missing
// (better than a cryptic runtime failure deep in a route).

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  get databaseUrl(): string {
    return required("DATABASE_URL");
  },
  get supabaseUrl(): string {
    return required("SUPABASE_URL");
  },
  get supabaseServiceRoleKey(): string {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get supabaseJwtSecret(): string {
    return required("SUPABASE_JWT_SECRET");
  },
  get openaiApiKey(): string {
    return required("OPENAI_API_KEY");
  },
};
