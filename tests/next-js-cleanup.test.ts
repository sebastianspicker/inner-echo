import { describe, expect, it } from "vitest";

describe("next js", () => {
  it("keeps the scope label stable", () => {
    expect("next js").toContain("next");
  });
});

// regression note: next_js
it("keeps next js stable", () => {
  expect("next js").toContain("next");
});
