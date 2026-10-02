import assert from "node:assert/strict";
import test from "node:test";

import { hitRadiusForScale, nearestStation } from "../public/js/map.js";

test("chooses the actionable station nearest the pointer when hit areas overlap", () => {
  const points = new Map([
    ["avron", { x: 10, y: 10 }],
    ["buzenval", { x: 16, y: 13 }],
    ["used", { x: 11, y: 10 }],
  ]);

  assert.equal(
    nearestStation(points, new Set(["avron", "buzenval"]), { x: 11, y: 10 }),
    "avron",
  );
});

test("keeps pointer targets at least 24 CSS pixels wide", () => {
  assert.equal(hitRadiusForScale(1), 12);
  assert.equal(hitRadiusForScale(0.5), 24);
  assert.equal(hitRadiusForScale(2), 11);
});
