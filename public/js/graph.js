export function normalizeName(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^\p{L}\p{N}_]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function createGraph(data) {
  const stations = data.stations.map((station) => ({ ...station }));
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const adjacency = new Map(stations.map((station) => [station.id, new Set()]));
  const nameIndex = new Map();

  for (const station of stations) {
    const names = new Set([station.name, ...(station.normalized_names ?? [])]);
    for (const name of names) {
      const key = normalizeName(name);
      if (!key) continue;
      const stationIds = nameIndex.get(key) ?? new Set();
      stationIds.add(station.id);
      nameIndex.set(key, stationIds);
    }
  }

  for (const edge of data.edges) {
    for (const stationId of [edge.station_a, edge.station_b]) {
      if (!stationById.has(stationId)) {
        throw new Error(`Edge references unknown station ${stationId}`);
      }
    }
    adjacency.get(edge.station_a).add(edge.station_b);
    adjacency.get(edge.station_b).add(edge.station_a);
  }

  function neighboursOf(stationId) {
    return [...(adjacency.get(stationId) ?? [])].sort();
  }

  function resolveStation(query) {
    const matches = [...(nameIndex.get(normalizeName(query)) ?? [])].sort();
    if (matches.length === 0) return { kind: "unknown" };
    if (matches.length > 1) return { kind: "ambiguous", stationIds: matches };
    return { kind: "resolved", stationId: matches[0] };
  }

  return {
    metadata: {
      ...data.metadata,
      optimal_route: [...(data.metadata.optimal_route ?? [])],
    },
    lines: data.lines.map((line) => ({ ...line })),
    stations,
    stationById,
    edges: data.edges.map((edge) => ({ ...edge, line_ids: [...edge.line_ids] })),
    neighboursOf,
    resolveStation,
  };
}
