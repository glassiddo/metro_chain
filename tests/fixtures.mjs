export const graphFixture = {
  metadata: { station_count: 4, edge_count: 2 },
  lines: [{ id: "m1", name: "1", color: "#ffcc00" }],
  stations: [
    { id: "a", name: "Étoile", normalized_names: ["etoile"], latitude: 1, longitude: 1, line_ids: ["m1"] },
    { id: "b", name: "B-B", normalized_names: ["b b"], latitude: 2, longitude: 2, line_ids: ["m1"] },
    { id: "c", name: "Cité", normalized_names: ["cite", "central"], latitude: 3, longitude: 3, line_ids: ["m1"] },
    { id: "d", name: "Central", normalized_names: ["central"], latitude: 4, longitude: 4, line_ids: ["m1"] }
  ],
  edges: [
    { station_a: "a", station_b: "b", line_ids: ["m1"] },
    { station_a: "b", station_b: "c", line_ids: ["m1"] }
  ]
};
