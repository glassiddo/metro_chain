"""Extract the playable Métro graph from Chronométro's Paris snapshot."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any


EXPECTED_LINE_COUNT = 16
EXPECTED_STATION_COUNT = 324


def normalize_name(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value)
    without_marks = "".join(
        character for character in decomposed if not unicodedata.combining(character)
    )
    words = re.sub(r"[^\w]+", " ", without_marks.casefold(), flags=re.UNICODE)
    return " ".join(words.split())


def _line_sort_key(line: dict[str, Any]) -> tuple[int, str]:
    match = re.match(r"^(\d+)", line["name"])
    return (int(match.group(1)) if match else 999, line["name"].casefold())


def extract_network(source: dict[str, Any]) -> dict[str, Any]:
    routes = source.get("routes", {})
    metro_route_ids = {
        route_id
        for route_id, route in routes.items()
        if route.get("mode") == "metro"
    }

    lines = sorted(
        (
            {
                "id": route_id,
                "name": routes[route_id]["name"],
                "color": routes[route_id]["color"],
            }
            for route_id in metro_route_ids
        ),
        key=_line_sort_key,
    )

    edge_lines: dict[tuple[str, str], set[str]] = defaultdict(set)
    station_lines: dict[str, set[str]] = defaultdict(set)
    for direction in source.get("directions", {}).values():
        route_id = direction.get("routeId")
        if route_id not in metro_route_ids:
            continue
        station_ids = direction.get("stations", [])
        for station_id in station_ids:
            station_lines[station_id].add(route_id)
        for first, second in zip(station_ids, station_ids[1:]):
            if first == second:
                continue
            edge_lines[tuple(sorted((first, second)))].add(route_id)

    source_stations = source.get("stations", {})
    stations = []
    for station_id in sorted(station_lines):
        station = source_stations[station_id]
        stations.append(
            {
                "id": station_id,
                "name": station["name"],
                "normalized_names": [normalize_name(station["name"])],
                "latitude": station["lat"],
                "longitude": station["lon"],
                "line_ids": sorted(station_lines[station_id]),
            }
        )

    edges = [
        {
            "station_a": pair[0],
            "station_b": pair[1],
            "line_ids": sorted(line_ids),
        }
        for pair, line_ids in sorted(edge_lines.items())
    ]

    metadata = source.get("metadata", {})
    return {
        "metadata": {
            "source_snapshot": metadata.get("feedVersion", "unknown"),
            "feed_valid_from": metadata.get("feedValidFrom"),
            "feed_valid_to": metadata.get("feedValidTo"),
            "station_count": len(stations),
            "edge_count": len(edges),
            "attribution": "Île-de-France Mobilités / ITO World GTFS export",
        },
        "lines": lines,
        "stations": stations,
        "edges": edges,
    }


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    if not args.source.is_file():
        raise SystemExit(f"Source network not found: {args.source}")

    with args.source.open(encoding="utf-8") as source_file:
        network = extract_network(json.load(source_file))

    if len(network["lines"]) != EXPECTED_LINE_COUNT:
        raise SystemExit(
            f"Expected {EXPECTED_LINE_COUNT} Métro lines, found {len(network['lines'])}"
        )
    if len(network["stations"]) != EXPECTED_STATION_COUNT:
        raise SystemExit(
            f"Expected {EXPECTED_STATION_COUNT} stations, found {len(network['stations'])}"
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(network, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Wrote {len(network['stations'])} stations, "
        f"{len(network['edges'])} edges, and {len(network['lines'])} lines "
        f"to {args.output}"
    )


if __name__ == "__main__":
    main()
