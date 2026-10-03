export function stationsForLine(graph, lineId) {
  return graph.stations.filter((station) => station.line_ids.includes(lineId));
}
