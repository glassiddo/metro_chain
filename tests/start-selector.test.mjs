import assert from "node:assert/strict";
import test from "node:test";

import { stationsForLine } from "../public/js/start-selector.js";
import { createGraph } from "../public/js/graph.js";
import { graphFixture } from "./fixtures.mjs";

test("groups starting stations by Metro line", () => {
  const graph = createGraph(graphFixture);

  assert.deepEqual(stationsForLine(graph, "m1").map(({ id }) => id), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(stationsForLine(graph, "m2").map(({ id }) => id), ["c", "f"]);
});
