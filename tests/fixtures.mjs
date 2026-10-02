export const graphFixture = {
  metadata: { station_count: 6, edge_count: 5 },
  lines: [
    { id: "m1", name: "1", color: "#ffcc00" },
    { id: "m2", name: "2", color: "#0064b0" },
  ],
  stations: [
    { id: "a", name: "Étoile", normalized_names: ["etoile"], latitude: 1, longitude: 1, line_ids: ["m1"] },
    { id: "b", name: "B-B", normalized_names: ["b b"], latitude: 2, longitude: 2, line_ids: ["m1"] },
    { id: "c", name: "Cité", normalized_names: ["cite", "central"], latitude: 3, longitude: 3, line_ids: ["m1", "m2"] },
    { id: "d", name: "Central", normalized_names: ["central"], latitude: 4, longitude: 4, line_ids: ["m1"] },
    { id: "e", name: "East", normalized_names: ["east"], latitude: 5, longitude: 5, line_ids: ["m1"] },
    { id: "f", name: "Fork", normalized_names: ["fork"], latitude: 3, longitude: 4, line_ids: ["m2"] }
  ],
  edges: [
    { station_a: "a", station_b: "b", line_ids: ["m1"] },
    { station_a: "b", station_b: "c", line_ids: ["m1"] },
    { station_a: "c", station_b: "d", line_ids: ["m1"] },
    { station_a: "d", station_b: "e", line_ids: ["m1"] },
    { station_a: "c", station_b: "f", line_ids: ["m2"] }
  ]
};
