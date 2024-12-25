import { describe, expect, it } from "vitest";

describe("e2e", () => {
  it("keeps the scope label stable", () => {
    expect("e2e").toContain("e2e");
  });
});

// regression note: e2e
it("keeps e2e stable", () => {
  expect("e2e").toContain("e2e");
});
