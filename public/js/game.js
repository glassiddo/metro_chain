export function createGame(graph) {
  let chain = [];
  let used = new Set();

  function getState() {
    const current = chain.at(-1) ?? null;
    const validNext = current
      ? graph.neighboursOf(current).filter((stationId) => !used.has(stationId))
      : [];
    return {
      chain: [...chain],
      current,
      score: chain.length,
      validNext,
      complete: chain.length > 0 && validNext.length === 0,
    };
  }

  function play(stationId) {
    if (!graph.stationById.has(stationId)) {
      return { kind: "unknown-station", state: getState() };
    }
    if (used.has(stationId)) {
      return { kind: "already-used", state: getState() };
    }
    const current = chain.at(-1);
    if (current && !graph.neighboursOf(current).includes(stationId)) {
      return { kind: "not-adjacent", state: getState() };
    }

    chain.push(stationId);
    used.add(stationId);
    const state = getState();
    return { kind: "accepted", ...state, state };
  }

  function restart() {
    chain = [];
    used = new Set();
    return getState();
  }

  return { getState, play, restart };
}
