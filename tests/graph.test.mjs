import assert from "node:assert/strict";
import test from "node:test";

import { createGraph, normalizeName } from "../public/js/graph.js";
import { graphFixture } from "./fixtures.mjs";

test("indexes symmetric station neighbours without exposing mutable state", () => {
  const graph = createGraph(graphFixture);
  const neighbours = graph.neighboursOf("b");

  assert.deepEqual(neighbours, ["a", "c"]);
  neighbours.pop();
  assert.deepEqual(graph.neighboursOf("b"), ["a", "c"]);
});

test("normalizes accents, punctuation, and case", () => {
  assert.equal(normalizeName("  ÉTOILE—Nord  "), "etoile nord");
  const graph = createGraph(graphFixture);
  assert.deepEqual(graph.resolveStation("éTOILE"), { kind: "resolved", stationId: "a" });
  assert.deepEqual(graph.resolveStation("B–B"), { kind: "resolved", stationId: "b" });
});

test("distinguishes unknown and ambiguous station names", () => {
  const graph = createGraph(graphFixture);

  assert.deepEqual(graph.resolveStation("missing"), { kind: "unknown" });
  assert.deepEqual(graph.resolveStation("central"), {
    kind: "ambiguous",
    stationIds: ["c", "d"]
  });
});

test("rejects edges that reference an unknown station", () => {
  assert.throws(
    () => createGraph({ ...graphFixture, edges: [{ station_a: "a", station_b: "z", line_ids: ["m1"] }] }),
    /unknown station z/
  );
});
