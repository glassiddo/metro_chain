"""Compute the exact maximum Metro chain with a mixed-integer program."""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


def terminal_station_ids(network: dict[str, Any]) -> set[str]:
    line_neighbours: dict[tuple[str, str], set[str]] = defaultdict(set)
    for edge in network["edges"]:
        for line_id in edge["line_ids"]:
            line_neighbours[(edge["station_a"], line_id)].add(edge["station_b"])
            line_neighbours[(edge["station_b"], line_id)].add(edge["station_a"])

    terminals = set()
    for station in network["stations"]:
        if len(station["line_ids"]) > 1:
            terminals.add(station["id"])
            continue
        if any(len(line_neighbours[(station["id"], line_id)]) != 2 for line_id in station["line_ids"]):
            terminals.add(station["id"])
    return terminals


def validate_route(network: dict[str, Any], route: list[str]) -> None:
    station_ids = {station["id"] for station in network["stations"]}
    if not route:
        raise ValueError("Route is empty")
    if len(route) != len(set(route)):
        raise ValueError("Route repeats a station")
    unknown = set(route) - station_ids
    if unknown:
        raise ValueError(f"Route contains unknown stations: {sorted(unknown)}")

    edges = {
        frozenset((edge["station_a"], edge["station_b"]))
        for edge in network["edges"]
    }
    for first, second in zip(route, route[1:]):
        if frozenset((first, second)) not in edges:
            raise ValueError(f"Route uses a non-edge: {first} -> {second}")
    if len(route) > 1 and route[-1] not in terminal_station_ids(network):
        raise ValueError("Route ends at a station that cannot finish a jump")


def solve_network(network: dict[str, Any]) -> list[str]:
    try:
        import numpy as np
        from scipy.optimize import Bounds, LinearConstraint, milp
        from scipy.sparse import lil_matrix
    except ImportError as error:
        raise SystemExit(
            "SciPy is required only for this offline solver. Install scipy and retry."
        ) from error

    stations = network["stations"]
    station_ids = [station["id"] for station in stations]
    node_index = {station_id: index for index, station_id in enumerate(station_ids)}
    undirected_edges = [
        (node_index[edge["station_a"]], node_index[edge["station_b"]])
        for edge in network["edges"]
    ]
    arcs = [(first, second) for edge in undirected_edges for first, second in (edge, edge[::-1])]
    node_count = len(stations)
    arc_count = len(arcs)

    y_offset = arc_count
    start_offset = y_offset + node_count
    end_offset = start_offset + node_count
    order_offset = end_offset + node_count
    variable_count = order_offset + node_count

    incoming: list[list[int]] = [[] for _ in stations]
    outgoing: list[list[int]] = [[] for _ in stations]
    for arc_index, (first, second) in enumerate(arcs):
        outgoing[first].append(arc_index)
        incoming[second].append(arc_index)

    row_count = node_count * 3 + 2 + arc_count
    matrix = lil_matrix((row_count, variable_count), dtype=float)
    lower = np.full(row_count, -np.inf)
    upper = np.full(row_count, np.inf)
    row = 0

    for node in range(node_count):
        for arc_index in incoming[node]:
            matrix[row, arc_index] = 1
        matrix[row, start_offset + node] = 1
        matrix[row, y_offset + node] = -1
        lower[row] = upper[row] = 0
        row += 1

        for arc_index in outgoing[node]:
            matrix[row, arc_index] = 1
        matrix[row, end_offset + node] = 1
        matrix[row, y_offset + node] = -1
        lower[row] = upper[row] = 0
        row += 1

        matrix[row, order_offset + node] = 1
        matrix[row, y_offset + node] = -(node_count - 1)
        upper[row] = 0
        row += 1

    for node in range(node_count):
        matrix[row, start_offset + node] = 1
    lower[row] = upper[row] = 1
    row += 1

    for node in range(node_count):
        matrix[row, end_offset + node] = 1
    lower[row] = upper[row] = 1
    row += 1

    for arc_index, (first, second) in enumerate(arcs):
        matrix[row, order_offset + first] = 1
        matrix[row, order_offset + second] = -1
        matrix[row, arc_index] = node_count
        upper[row] = node_count - 1
        row += 1

    objective = np.zeros(variable_count)
    objective[y_offset : y_offset + node_count] = -1
    integrality = np.zeros(variable_count)
    integrality[:order_offset] = 1
    variable_lower = np.zeros(variable_count)
    variable_upper = np.ones(variable_count)
    variable_upper[order_offset:] = node_count - 1

    terminal_ids = terminal_station_ids(network)
    for node, station_id in enumerate(station_ids):
        if station_id not in terminal_ids:
            variable_upper[end_offset + node] = 0

    result = milp(
        c=objective,
        integrality=integrality,
        bounds=Bounds(variable_lower, variable_upper),
        constraints=LinearConstraint(matrix.tocsr(), lower, upper),
        options={"disp": True, "mip_rel_gap": 0.0},
    )
    if not result.success or result.mip_gap != 0:
        raise SystemExit(f"Exact solve failed: {result.message}; MIP gap={result.mip_gap}")

    selected_arcs = {
        first: second
        for arc_index, (first, second) in enumerate(arcs)
        if result.x[arc_index] > 0.5
    }
    start = next(
        node for node in range(node_count) if result.x[start_offset + node] > 0.5
    )
    route_nodes = [start]
    while route_nodes[-1] in selected_arcs:
        route_nodes.append(selected_arcs[route_nodes[-1]])
    route = [station_ids[node] for node in route_nodes]
    validate_route(network, route)
    if len(route) != round(-result.fun):
        raise SystemExit("Solver objective does not match reconstructed route")
    return route


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True, type=Path)
    args = parser.parse_args()

    network = json.loads(args.data.read_text(encoding="utf-8"))
    route = solve_network(network)
    network["metadata"]["maximum_score"] = len(route)
    network["metadata"]["optimal_route"] = route
    network["metadata"]["maximum_method"] = "Exact MILP longest simple path; zero optimality gap"
    args.data.write_text(
        json.dumps(network, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Verified exact maximum: {len(route)} stations")


if __name__ == "__main__":
    main()
