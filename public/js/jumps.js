function lineAdjacency(graph, lineId) {
  const adjacency = new Map();
  for (const edge of graph.edges) {
    if (!edge.line_ids.includes(lineId)) continue;
    for (const [from, to] of [[edge.station_a, edge.station_b], [edge.station_b, edge.station_a]]) {
      const neighbours = adjacency.get(from) ?? [];
      neighbours.push(to);
      adjacency.set(from, neighbours);
    }
  }
  for (const neighbours of adjacency.values()) neighbours.sort();
  return adjacency;
}

function isJumpDestination(graph, adjacency, stationId) {
  const station = graph.stationById.get(stationId);
  return station.line_ids.length > 1 || (adjacency.get(stationId)?.length ?? 0) !== 2;
}

export function findJumpOptions(graph, currentId, usedStationIds) {
  const current = graph.stationById.get(currentId);
  if (!current) return [];

  const lineById = new Map(graph.lines.map((line) => [line.id, line]));
  const options = [];
  const lineIds = [...current.line_ids].sort((a, b) =>
    lineById.get(a).name.localeCompare(lineById.get(b).name, "fr", { numeric: true }),
  );

  for (const lineId of lineIds) {
    const adjacency = lineAdjacency(graph, lineId);
    const stack = [{ stationId: currentId, path: [], visited: new Set([currentId]) }];

    while (stack.length) {
      const { stationId, path, visited } = stack.pop();
      for (const neighbourId of [...(adjacency.get(stationId) ?? [])].reverse()) {
        if (visited.has(neighbourId) || usedStationIds.has(neighbourId)) continue;
        const nextPath = [...path, neighbourId];
        stack.push({
          stationId: neighbourId,
          path: nextPath,
          visited: new Set([...visited, neighbourId]),
        });

        if (!isJumpDestination(graph, adjacency, neighbourId)) continue;
        options.push({ stationId: neighbourId, lineId, path: nextPath });
      }
    }
  }

  return options.sort((first, second) => {
    const lineOrder = lineById.get(first.lineId).name.localeCompare(
      lineById.get(second.lineId).name,
      "fr",
      { numeric: true },
    );
    return lineOrder || first.path.length - second.path.length ||
      graph.stationById.get(first.stationId).name.localeCompare(
        graph.stationById.get(second.stationId).name,
        "fr",
      );
  });
}
