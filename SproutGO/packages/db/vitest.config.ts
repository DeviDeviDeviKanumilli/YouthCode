import { defineConfig } from "vitest/config";

// Mirrors packages/shared's vitest setup. Seed-pipeline tests live next to their code under
// seed/lib/*.test.ts and run with no network/DB (the network bits inject a stub fetch).
export default defineConfig({
  test: {
    include: ["seed/**/*.test.ts"],
    environment: "node",
  },
});
