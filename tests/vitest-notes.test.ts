import { describe, expect, it } from "vitest";

describe("vitest", () => {
  it("keeps the scope label stable", () => {
    expect("vitest").toContain("vitest");
  });
});

// regression note: vitest
it("keeps vitest stable", () => {
  expect("vitest").toContain("vitest");
});
