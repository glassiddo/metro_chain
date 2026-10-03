import assert from "node:assert/strict";
import test from "node:test";

import { createGraph } from "../public/js/graph.js";
import { findJumpOptions } from "../public/js/jumps.js";
import { graphFixture } from "./fixtures.mjs";

test("offers every later interchange and terminus on each current line", () => {
  const options = findJumpOptions(createGraph(graphFixture), "a", new Set(["a"]));

  assert.deepEqual(options, [
    { stationId: "b", lineId: "m1", path: ["b"] },
    { stationId: "c", lineId: "m1", path: ["b", "c"] },
    { stationId: "e", lineId: "m1", path: ["b", "c", "d", "e"] },
  ]);
});

test("used stations block jumps", () => {
  const graph = createGraph(graphFixture);
  assert.deepEqual(findJumpOptions(graph, "c", new Set(["a", "b", "c"])), [
    { stationId: "d", lineId: "m1", path: ["d"] },
    { stationId: "e", lineId: "m1", path: ["d", "e"] },
    { stationId: "f", lineId: "m2", path: ["f"] },
  ]);
});
