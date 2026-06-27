import { describe, it, expect, afterEach } from "vitest";
import { getPlantIdentifier, usesRealIdentifier } from "./index";
import { StubPlantIdentifier } from "./StubPlantIdentifier";
import { OpenAIPlantIdentifier } from "./OpenAIPlantIdentifier";

// getPlantIdentifier must never silently use the offline stub in production — that would
// let any authenticated caller mint high-confidence observations without a real image.
const origKey = process.env.OPENAI_API_KEY;
const origNodeEnv = process.env.NODE_ENV;

// NODE_ENV is typed read-only; cast for the test toggles.
const setNodeEnv = (v: string | undefined) => {
  (process.env as Record<string, string | undefined>).NODE_ENV = v;
};

afterEach(() => {
  if (origKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = origKey;
  setNodeEnv(origNodeEnv);
});

describe("getPlantIdentifier", () => {
  it("uses the OpenAI identifier when a key is present", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(getPlantIdentifier()).toBeInstanceOf(OpenAIPlantIdentifier);
    expect(usesRealIdentifier()).toBe(true);
  });

  it("falls back to the stub in non-production when no key is set", () => {
    delete process.env.OPENAI_API_KEY;
    setNodeEnv("test");
    expect(getPlantIdentifier()).toBeInstanceOf(StubPlantIdentifier);
    expect(usesRealIdentifier()).toBe(false);
  });

  it("refuses the stub in production when no key is set", () => {
    delete process.env.OPENAI_API_KEY;
    setNodeEnv("production");
    expect(() => getPlantIdentifier()).toThrow(/OPENAI_API_KEY is required in production/);
  });
});
