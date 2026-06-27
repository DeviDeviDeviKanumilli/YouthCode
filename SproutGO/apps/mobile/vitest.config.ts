import { defineConfig } from "vitest/config";

// Mirrors packages/shared: node env, colocated *.test.ts. These tests cover the pure
// data layer (mockData fixtures) the presentational screens depend on — not the RN
// components themselves, which are exercised via the manual checklist in
// currentPlans/TESTING.md.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
