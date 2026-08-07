import { describe, expect, it } from "vitest";
import { clampSeconds, formatRemaining, snapshot } from "./timer";

describe("timer helpers", () => {
  it("clamps custom durations to a practical range", () => {
    expect(clampSeconds(2)).toBe(5);
    expect(clampSeconds(42.4)).toBe(42);
    expect(clampSeconds(999)).toBe(180);
    expect(clampSeconds(Number.NaN)).toBe(30);
  });

  it("calculates countdown progress from a deadline", () => {
    expect(snapshot("heating", 31_000, 30_000, 1_000)).toEqual({
      phase: "heating",
      remainingMs: 30_000,
      durationMs: 30_000,
      progress: 0,
    });
    expect(snapshot("heating", 31_000, 30_000, 16_000).progress).toBe(0.5);
    expect(snapshot("heating", 31_000, 30_000, 40_000).progress).toBe(1);
  });

  it("rounds the visible countdown upward", () => {
    expect(formatRemaining(1)).toBe("1");
    expect(formatRemaining(1_001)).toBe("2");
    expect(formatRemaining(0)).toBe("0");
  });
});
