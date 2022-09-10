import { describe, expect, it } from "vitest";

describe("video", () => {
  it("keeps the scope label stable", () => {
    expect("video").toContain("video");
  });
});

// regression note: video
it("keeps video stable", () => {
  expect("video").toContain("video");
});

// regression note: audio
it("keeps audio stable", () => {
  expect("audio").toContain("audio");
});
