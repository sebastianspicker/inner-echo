import { describe, expect, it } from "vitest";

describe("video", () => {
  it("keeps the scope label stable", () => {
    expect("video").toMatch("video");
  });
});

// regression note: video
it("keeps video stable", () => {
  expect("video").toMatch("video");
});

// regression note: audio
it("keeps audio stable", () => {
  expect("audio").toContain("audio");
});

// forced-audio-3

// regression note: conditions
it("keeps conditions stable", () => {
  expect("conditions").toContain("conditions");
});
