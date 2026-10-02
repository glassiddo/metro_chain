import assert from "node:assert/strict";
import test from "node:test";

import { createGame } from "../public/js/game.js";
import { createGraph } from "../public/js/graph.js";
import { graphFixture } from "./fixtures.mjs";

test("accepts adjacent unused stations and rejects other moves", () => {
  const game = createGame(createGraph(graphFixture));

  assert.equal(game.play("a").kind, "accepted");
  assert.equal(game.play("c").kind, "not-adjacent");
  assert.equal(game.play("b").kind, "accepted");
  assert.equal(game.play("a").kind, "already-used");
  assert.deepEqual(game.getState().chain, ["a", "b"]);
  assert.deepEqual(game.getState().validNext, ["c"]);
  assert.equal(game.play("c").complete, true);
});

test("returns immutable state snapshots and restarts", () => {
  const game = createGame(createGraph(graphFixture));
  game.play("a");
  const snapshot = game.getState();
  snapshot.chain.push("c");
  snapshot.validNext.length = 0;

  assert.deepEqual(game.getState().chain, ["a"]);
  assert.deepEqual(game.getState().validNext, ["b"]);
  game.restart();
  assert.deepEqual(game.getState(), { chain: [], current: null, score: 0, validNext: [], complete: false });
});

test("rejects an unknown station id", () => {
  const game = createGame(createGraph(graphFixture));
  assert.deepEqual(game.play("z"), { kind: "unknown-station", state: game.getState() });
});
