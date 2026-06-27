import { describe, it, expect } from "vitest";
import { StubPlantChatter } from "./StubPlantChatter";

describe("StubPlantChatter", () => {
  it("deterministically echoes the user message (offline dev/test)", async () => {
    const out = await new StubPlantChatter().reply({
      systemPrompt: "ignored",
      history: [],
      message: "  how   tall  do you grow? ",
    });
    expect(out).toContain('You asked: "how tall do you grow?"');
  });
});
