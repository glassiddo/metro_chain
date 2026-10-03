import { findJumpOptions } from "./jumps.js?v=20261003a";

export function createGame(graph) {
  let chain = [];
  let used = new Set();

  function getState() {
    const current = chain.at(-1) ?? null;
    const jumpOptions = current ? findJumpOptions(graph, current, used) : [];
    return {
      chain: [...chain],
      current,
      score: chain.length,
      jumpOptions: jumpOptions.map((option) => ({ ...option, path: [...option.path] })),
      complete: chain.length > 0 && jumpOptions.length === 0,
    };
  }

  function start(stationId) {
    if (!graph.stationById.has(stationId)) {
      return { kind: "unknown-station", state: getState() };
    }
    if (chain.length) return { kind: "invalid-start", state: getState() };

    chain.push(stationId);
    used.add(stationId);
    const state = getState();
    return { kind: "accepted", ...state, state };
  }

  function jump(requestedOption) {
    const state = getState();
    const option = state.jumpOptions.find((candidate) =>
      candidate.stationId === requestedOption?.stationId &&
      candidate.lineId === requestedOption?.lineId &&
      candidate.path.join("|") === requestedOption?.path?.join("|"),
    );
    if (!option) return { kind: "invalid-jump", state };

    chain.push(...option.path);
    for (const stationId of option.path) used.add(stationId);
    const nextState = getState();
    return {
      kind: "accepted",
      ...nextState,
      addedCount: option.path.length,
      lineId: option.lineId,
      state: nextState,
    };
  }

  function restart() {
    chain = [];
    used = new Set();
    return getState();
  }

  return { getState, start, jump, restart };
}
