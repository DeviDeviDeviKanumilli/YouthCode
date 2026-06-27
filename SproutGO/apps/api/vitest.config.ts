import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirrors packages/shared's vitest setup, plus the "@/*" -> src/* path alias
// from tsconfig.json so test files can import route helpers via "@/config/...".
// A plain resolve.alias avoids pulling in vite-tsconfig-paths as a new dep.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
