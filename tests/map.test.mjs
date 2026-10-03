import assert from "node:assert/strict";
import test from "node:test";

import { clampZoom, edgeState, hitRadiusForScale } from "../public/js/map.js";

test("keeps map hover targets at least 24 CSS pixels wide", () => {
  assert.equal(hitRadiusForScale(1), 12);
  assert.equal(hitRadiusForScale(0.5), 24);
  assert.equal(hitRadiusForScale(2), 11);
});

test("classifies map segments as used, available, or unused", () => {
  const state = {
    chain: ["a", "b", "c"],
    current: "c",
    jumpOptions: [{ path: ["d", "e"] }, { path: ["f"] }],
  };

  assert.equal(edgeState({ station_a: "a", station_b: "b" }, state), "used");
  assert.equal(edgeState({ station_a: "c", station_b: "d" }, state), "available");
  assert.equal(edgeState({ station_a: "d", station_b: "e" }, state), "available");
  assert.equal(edgeState({ station_a: "b", station_b: "d" }, state), "unused");
});

test("keeps map zoom within usable bounds", () => {
  assert.equal(clampZoom(0.5), 1);
  assert.equal(clampZoom(2.5), 2.5);
  assert.equal(clampZoom(8), 4);
});
