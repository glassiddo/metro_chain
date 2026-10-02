import assert from "node:assert/strict";
import test from "node:test";

import { hitRadiusForScale } from "../public/js/map.js";

test("keeps map hover targets at least 24 CSS pixels wide", () => {
  assert.equal(hitRadiusForScale(1), 12);
  assert.equal(hitRadiusForScale(0.5), 24);
  assert.equal(hitRadiusForScale(2), 11);
});
