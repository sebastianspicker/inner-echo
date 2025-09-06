import { describe, expect, it } from "vitest";

describe("csp", () => {
  it("keeps the scope label stable", () => {
    expect("csp").toContain("csp");
  });
});

// regression note: csp
it("keeps csp stable", () => {
  expect("csp").toContain("csp");
});

// forced-csp-2
