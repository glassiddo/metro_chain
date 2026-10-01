import json
import tempfile
import unittest
from pathlib import Path

from scripts.extract_metro import extract_network, normalize_name


class ExtractMetroTests(unittest.TestCase):
    def test_normalize_name_removes_accents_and_punctuation(self):
        self.assertEqual(
            normalize_name("Charles de Gaulle–Étoile"),
            "charles de gaulle etoile",
        )

    def test_extracts_unique_undirected_edges_and_line_ids(self):
        source = {
            "routes": {
                "m1": {"mode": "metro", "name": "1", "color": "#ffcc00"},
                "m2": {"mode": "metro", "name": "2", "color": "#0064b0"},
                "r": {"mode": "rer", "name": "A", "color": "#e3051c"},
            },
            "directions": {
                "m1:0": {"routeId": "m1", "stations": ["a", "b", "c"]},
                "m1:1": {"routeId": "m1", "stations": ["c", "b", "a"]},
                "m2:0": {"routeId": "m2", "stations": ["a", "b"]},
                "r:0": {"routeId": "r", "stations": ["c", "d"]},
            },
            "stations": {
                station_id: {
                    "id": station_id,
                    "name": station_id.upper(),
                    "lat": 48.8,
                    "lon": 2.3,
                    "modes": ["metro"],
                    "services": {},
                }
                for station_id in "abcd"
            },
        }

        result = extract_network(source)

        self.assertEqual([line["name"] for line in result["lines"]], ["1", "2"])
        self.assertEqual(
            [edge["station_a"] + edge["station_b"] for edge in result["edges"]],
            ["ab", "bc"],
        )
        self.assertEqual(result["edges"][0]["line_ids"], ["m1", "m2"])
        self.assertEqual(
            [station["id"] for station in result["stations"]],
            ["a", "b", "c"],
        )

    def test_file_input_is_not_modified(self):
        source = {"routes": {}, "directions": {}, "stations": {}}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "network.json"
            path.write_text(json.dumps(source), encoding="utf-8")
            before = path.read_bytes()
            extract_network(json.loads(path.read_text(encoding="utf-8")))
            self.assertEqual(path.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
