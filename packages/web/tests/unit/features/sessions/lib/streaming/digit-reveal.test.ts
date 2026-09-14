import {describe, expect, it} from "vitest";
import {planDigitReveal} from "@/features/sessions/lib/streaming/digit-reveal-plan";

describe("whole-message digit reveal", () => {
  it.each(["A short reply.", "A complete paragraph with multiple words.\n".repeat(100), "αβ π 👩‍💻\nconst value = 42;"])(
    "starts every character as a number and finishes within 450 ms: %.30s",
    (text) => {
      const plan = planDigitReveal({text: "", deadlines: []}, text, 1000);
      expect(plan.deadlines).toHaveLength(text.length);
      expect(plan.deadlines.every((deadline) => deadline >= 1200 && deadline <= 1450)).toBe(true);
      expect(plan.text).toBe(text);
    }
  );
  it("masks a late streamed suffix without restarting the already readable text", () => {
    const first = planDigitReveal({text: "", deadlines: []}, "The first line.\n", 0);
    const next = planDigitReveal(first, first.text + "The next paragraph arrives much later.", 3000);
    expect(next.deadlines.slice(0, first.text.length)).toEqual(first.deadlines);
    expect(next.deadlines.slice(first.text.length).every((deadline) => deadline >= 3200 && deadline <= 3450)).toBe(true);
  });
  it("preserves deadlines through a markup remount and handles replacement text", () => {
    const first = planDigitReveal({text: "", deadlines: []}, "Keep the start", 0);
    expect(planDigitReveal(first, first.text, 5000)).toEqual(first);
    const replacement = planDigitReveal(first, "Keep a correction", 5000);
    expect(replacement.deadlines.slice(0, 5)).toEqual(first.deadlines.slice(0, 5));
    expect(replacement.deadlines.slice(5).every((deadline) => deadline >= 5200)).toBe(true);
  });
});
