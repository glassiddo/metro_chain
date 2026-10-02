import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { createGraph } from "../public/js/graph.js";

const data = JSON.parse(readFileSync(new URL("../public/data/metro.json", import.meta.url), "utf8"));
const graph = createGraph(data);
const idByName = new Map(graph.stations.map((station) => [station.name, station.id]));
const neighbourNames = (name) => graph.neighboursOf(idByName.get(name)).map((id) => graph.stationById.get(id).name).sort((a, b) => a.localeCompare(b, "fr"));

test("production graph has the expected fixed snapshot dimensions", () => {
  assert.equal(data.metadata.source_snapshot, "20260630_200738");
  assert.equal(graph.lines.length, 16);
  assert.equal(graph.stations.length, 321);
  assert.equal(graph.edges.length, 381);
});

test("production edges are unique, valid, and never self-referential", () => {
  const keys = new Set();
  for (const edge of graph.edges) {
    assert.notEqual(edge.station_a, edge.station_b);
    assert.ok(graph.stationById.has(edge.station_a));
    assert.ok(graph.stationById.has(edge.station_b));
    const key = [edge.station_a, edge.station_b].sort().join("|");
    assert.equal(keys.has(key), false, `duplicate edge ${key}`);
    keys.add(key);
  }
});

test("all stations are connected to one playable component", () => {
  const visited = new Set();
  const queue = [graph.stations[0].id];
  while (queue.length) {
    const stationId = queue.shift();
    if (visited.has(stationId)) continue;
    visited.add(stationId);
    queue.push(...graph.neighboursOf(stationId));
  }
  assert.equal(visited.size, 321);
});

test("production lookup accepts common short station names", () => {
  const resolvedName = (query) => graph.stationById.get(graph.resolveStation(query).stationId)?.name;
  assert.equal(resolvedName("orly"), "Aéroport d’Orly (Terminaux 1-2-3)");
  assert.equal(resolvedName("cdg etoile"), "Charles de Gaulle - Étoile");
  assert.equal(resolvedName("bnf"), "Bibliothèque François Mitterrand");
});

test("source duplicates are merged into one station complex", () => {
  assert.equal(graph.stations.filter((station) => station.name === "Jules Joffrin").length, 1);
  assert.equal(graph.stations.filter((station) => station.name === "Montparnasse Bienvenue").length, 1);
  assert.equal(graph.stations.some((station) => station.name === "Gare Montparnasse"), false);
  assert.equal(idByName.has("Montparnasse Bienvenue"), true);
  assert.equal(graph.stationById.get(idByName.get("Montparnasse Bienvenue")).line_ids.length, 4);
});

test("La Fourche retains the two physical line 13 branches", () => {
  assert.deepEqual(neighbourNames("La Fourche"), ["Brochant", "Guy Môquet", "Place de Clichy"]);
});

test("Maison Blanche joins both line 7 branches and line 14", () => {
  assert.deepEqual(neighbourNames("Maison Blanche"), [
    "Hôpital Bicêtre",
    "Le Kremlin-Bicêtre",
    "Olympiades",
    "Porte d'Italie",
    "Tolbiac",
  ]);
});

test("Châtelet is one station complex serving five Metro lines", () => {
  const station = graph.stationById.get(idByName.get("Châtelet"));
  assert.equal(station.line_ids.length, 5);
  assert.deepEqual(neighbourNames("Châtelet"), [
    "Cité",
    "Gare de Lyon",
    "Hôtel de Ville",
    "Les Halles",
    "Louvre - Rivoli",
    "Pont Marie (Cité des Arts)",
    "Pont Neuf",
    "Pyramides",
  ]);
});
