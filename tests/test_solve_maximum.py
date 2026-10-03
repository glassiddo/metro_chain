import unittest

from scripts.solve_maximum import terminal_station_ids, validate_route


class MaximumSolverTests(unittest.TestCase):
    def setUp(self):
        self.network = {
            "lines": [{"id": "line", "name": "1"}],
            "stations": [
                {"id": station_id, "name": station_id, "line_ids": ["line"]}
                for station_id in "abcd"
            ],
            "edges": [
                {"station_a": "a", "station_b": "b", "line_ids": ["line"]},
                {"station_a": "b", "station_b": "c", "line_ids": ["line"]},
                {"station_a": "c", "station_b": "d", "line_ids": ["line"]},
            ],
        }

    def test_identifies_line_termini(self):
        self.assertEqual(terminal_station_ids(self.network), {"a", "d"})

    def test_accepts_a_valid_no_repeat_route_ending_at_any_station(self):
        validate_route(self.network, ["a", "b", "c"])

    def test_rejects_repeated_and_non_adjacent_stations(self):
        with self.assertRaisesRegex(ValueError, "repeats"):
            validate_route(self.network, ["a", "b", "a"])
        with self.assertRaisesRegex(ValueError, "non-edge"):
            validate_route(self.network, ["a", "c", "d"])


if __name__ == "__main__":
    unittest.main()
