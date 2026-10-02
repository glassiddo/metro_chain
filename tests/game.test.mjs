import assert from "node:assert/strict";
import test from "node:test";

import { createGame } from "../public/js/game.js";
import { createGraph } from "../public/js/graph.js";
import { graphFixture } from "./fixtures.mjs";

test("starts anywhere and accepts a complete valid jump", () => {
  const game = createGame(createGraph(graphFixture));

  assert.equal(game.start("a").kind, "accepted");
  const option = game.getState().jumpOptions.find(({ stationId }) => stationId === "c");
  const result = game.jump(option);

  assert.equal(result.kind, "accepted");
  assert.equal(result.addedCount, 2);
  assert.deepEqual(game.getState().chain, ["a", "b", "c"]);
  assert.deepEqual(game.getState().jumpOptions.map(({ stationId }) => stationId).sort(), ["e", "f"]);
});

test("returns immutable state snapshots and restarts", () => {
  const game = createGame(createGraph(graphFixture));
  game.start("a");
  const snapshot = game.getState();
  snapshot.chain.push("c");
  snapshot.jumpOptions.length = 0;

  assert.deepEqual(game.getState().chain, ["a"]);
  assert.equal(game.getState().jumpOptions.length, 2);
  game.restart();
  assert.deepEqual(game.getState(), { chain: [], current: null, score: 0, jumpOptions: [], complete: false });
});

test("rejects unknown starts and jumps that are no longer valid", () => {
  const game = createGame(createGraph(graphFixture));
  assert.deepEqual(game.start("z"), { kind: "unknown-station", state: game.getState() });
  game.start("a");
  assert.equal(game.jump({ stationId: "e", lineId: "m1", path: ["e"] }).kind, "invalid-jump");
});
