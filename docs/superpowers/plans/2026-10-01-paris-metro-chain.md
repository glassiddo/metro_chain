# Paris Métro Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an untimed static Paris Métro chain game supporting typed and clicked moves over a verified 324-station graph.

**Architecture:** A Python extraction script reads the existing Chronométro Paris network without modifying it and writes a compact deterministic JSON bundle. Browser JavaScript modules keep graph indexing, game rules, SVG rendering, typed input, and page orchestration separate; the rules module has no DOM dependency.

**Tech Stack:** Python 3 standard library, semantic HTML, CSS, native browser JavaScript modules, SVG, Node.js built-in test runner, Python `unittest`, local static HTTP server.

**Spec:** `docs/superpowers/specs/2026-10-01-paris-metro-chain-design.md`

## Global Constraints

- Treat `C:\Users\iddo2\Dropbox\metro` as read-only.
- Include only Métro lines 1–14, 3bis, and 7bis from the fixed 2026 source snapshot.
- Use station complexes as playable nodes and direct consecutive stops as undirected edges.
- Support typed entry and clicking through one shared move-validation path.
- Highlight valid neighbours and provide no timer or undo.
- Use no frontend framework, bundler, backend, external map library, or copied RATP map.
- Keep the game usable on desktop and mobile and fully keyboard accessible.

---

### Task 1: Extract and verify the Métro graph

**Files:**
- Create: `scripts/extract_metro.py`
- Create: `tests/test_extract_metro.py`
- Create: `public/data/metro.json`
- Create: `README.md`

**Interfaces:**
- Consumes: Chronométro `network.json` objects `routes`, `directions`, and `stations`.
- Produces: `normalize_name(value: str) -> str`, `extract_network(source: dict) -> dict`, and deterministic `public/data/metro.json` with `metadata`, `lines`, `stations`, and `edges`.

- [ ] **Step 1: Write extraction tests**

Create `tests/test_extract_metro.py` with fixtures that prove normalization, bidirectional edge deduplication, shared-line preservation, and read-only source use:

```python
import json
import tempfile
import unittest
from pathlib import Path

from scripts.extract_metro import extract_network, normalize_name


class ExtractMetroTests(unittest.TestCase):
    def test_normalize_name_removes_accents_and_punctuation(self):
        self.assertEqual(normalize_name("Charles de Gaulle–Étoile"), "charles de gaulle etoile")

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
        self.assertEqual([edge["station_a"] + edge["station_b"] for edge in result["edges"]], ["ab", "bc"])
        self.assertEqual(result["edges"][0]["line_ids"], ["m1", "m2"])
        self.assertEqual([station["id"] for station in result["stations"]], ["a", "b", "c"])

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
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `python -m unittest tests.test_extract_metro -v`

Expected: import failure because `scripts.extract_metro` does not exist.

- [ ] **Step 3: Implement deterministic extraction**

Create `scripts/extract_metro.py`. Use `unicodedata.normalize("NFKD", value)`, replace punctuation with spaces, collapse whitespace, and case-fold names. Build an edge dictionary keyed by sorted station-ID tuples; add each direction's `routeId` to the edge's line set. Sort all emitted arrays by stable identifiers and omit source-only timing fields.

Expose this command:

```powershell
python scripts/extract_metro.py `
  --source C:\Users\iddo2\Dropbox\metro\public\data\paris\network.json `
  --output public\data\metro.json
```

The command must fail with a useful message when the source is absent, assert 16 lines and 324 stations for the production source, create only the output's parent directory, and write UTF-8 JSON with `ensure_ascii=False`, `indent=2`, and a final newline. Store the source snapshot identifier from `source["metadata"]`, but do not store a wall-clock generation time so repeated runs are byte-identical.

- [ ] **Step 4: Run unit tests and generate production data**

Run:

```powershell
python -m unittest tests.test_extract_metro -v
python scripts/extract_metro.py --source C:\Users\iddo2\Dropbox\metro\public\data\paris\network.json --output public\data\metro.json
python scripts/extract_metro.py --source C:\Users\iddo2\Dropbox\metro\public\data\paris\network.json --output $env:TEMP\metro-second.json
```

Expected: all tests pass, the production file reports 16 lines and 324 stations, and `Compare-Object (Get-Content public\data\metro.json) (Get-Content $env:TEMP\metro-second.json)` prints no differences.

- [ ] **Step 5: Document local data generation**

Create `README.md` with the game rules, source provenance, the extraction command, `python -m http.server 8000 --directory public`, test commands, and the explicit statement that the source project is read-only.

- [ ] **Step 6: Commit the extraction slice**

```powershell
git add README.md scripts/extract_metro.py tests/test_extract_metro.py public/data/metro.json
git commit -m "feat: extract Paris Metro game graph"
```

### Task 2: Implement graph indexing and game rules

**Files:**
- Create: `public/js/graph.js`
- Create: `public/js/game.js`
- Create: `tests/graph.test.mjs`
- Create: `tests/game.test.mjs`
- Create: `package.json`

**Interfaces:**
- Consumes: Task 1's JSON schema.
- Produces: `createGraph(data) -> Graph`, `resolveStation(query) -> Resolution`, `createGame(graph) -> Game`, and game methods `play(stationId)`, `restart()`, and `getState()`.

- [ ] **Step 1: Add Node test configuration and failing graph tests**

Create `package.json`:

```json
{
  "name": "paris-metro-chain",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs"
  }
}
```

Create `tests/graph.test.mjs` using a three-station fixture. Assert that `neighboursOf("b")` returns `a` and `c`, station lookup ignores `É`, punctuation, and case, unknown text returns `{ kind: "unknown" }`, and duplicated normalized aliases return `{ kind: "ambiguous", stations: [...] }`.

- [ ] **Step 2: Run graph tests and confirm they fail**

Run: `npm test`

Expected: module-not-found failure for `public/js/graph.js`.

- [ ] **Step 3: Implement graph indexing**

Implement `createGraph(data)` to validate referenced IDs, index stations and aliases with `Map`, build symmetric adjacency with `Set`, and expose:

```js
{
  lines,
  stations,
  stationById,
  edges,
  neighboursOf(stationId),
  resolveStation(query)
}
```

Return copies from `neighboursOf` so callers cannot mutate graph state. Share a browser implementation of the Python normalization rules.

- [ ] **Step 4: Run graph tests and confirm they pass**

Run: `npm test`

Expected: all graph tests pass.

- [ ] **Step 5: Write failing game-engine tests**

Create `tests/game.test.mjs` and assert:

```js
const game = createGame(graph);
assert.equal(game.play("a").kind, "accepted");
assert.equal(game.play("c").kind, "not-adjacent");
assert.equal(game.play("b").kind, "accepted");
assert.equal(game.play("a").kind, "already-used");
assert.deepEqual(game.getState().chain, ["a", "b"]);
assert.deepEqual(game.getState().validNext, ["c"]);
assert.equal(game.play("c").complete, true);
game.restart();
assert.deepEqual(game.getState().chain, []);
```

Also verify that the state snapshots cannot mutate internal game state.

- [ ] **Step 6: Implement the DOM-free game engine**

Implement `createGame(graph)` with private `chain` and `used` state. `play()` returns one of `accepted`, `unknown-station`, `already-used`, or `not-adjacent`; accepted results include `complete`, `score`, and a state snapshot. Completion is true only when no unused neighbour remains.

- [ ] **Step 7: Run tests and commit the rules slice**

Run: `npm test`

Expected: all graph and game tests pass.

```powershell
git add package.json public/js/graph.js public/js/game.js tests/graph.test.mjs tests/game.test.mjs
git commit -m "feat: add Metro chain game engine"
```

### Task 3: Build the accessible interactive website

**Files:**
- Create: `public/index.html`
- Create: `public/styles.css`
- Create: `public/js/map.js`
- Create: `public/js/input.js`
- Create: `public/js/app.js`
- Create: `tests/ui-contract.test.mjs`

**Interfaces:**
- Consumes: `createGraph`, `createGame`, and `public/data/metro.json`.
- Produces: `createMetroMap(svg, graph, onStationSelect)`, `createStationInput(form, graph, onStationSelect)`, and the complete playable page.

- [ ] **Step 1: Write failing structural UI tests**

Create `tests/ui-contract.test.mjs` using `node:fs` assertions. Require `index.html` to contain one `h1`, a labelled station input, an `aria-live` status region, score output, SVG title/description, restart button, and copy button. Require `styles.css` to contain a mobile breakpoint, `:focus-visible`, `prefers-reduced-motion`, and four distinct station-state selectors.

- [ ] **Step 2: Run UI contract tests and confirm they fail**

Run: `npm test`

Expected: missing-file failure for `public/index.html`.

- [ ] **Step 3: Build semantic page structure and responsive styling**

Create a two-column desktop layout with instructions and controls on the left and the map on the right. At widths below 760px, put the map first and controls below it. Use CSS custom properties for background, text, line, current, valid, used, error, and focus colours. Give SVG station hit areas a minimum 24 CSS-pixel interactive diameter while retaining smaller visible dots.

- [ ] **Step 4: Implement SVG map rendering**

In `map.js`, project longitude linearly to x and latitude to y within a padded viewBox. Draw edges before stations. For shared edges, use the first sorted line colour and expose all line names in an accessible label. Render every station as a focusable SVG button group with a transparent hit circle, visible marker, and `<title>`.

Expose `render(state)` to apply `station--current`, `station--valid`, `station--used`, and `station--muted`. Only current and valid stations are actionable after the first move; all are actionable at the start. Clicking or pressing Enter/Space calls `onStationSelect(stationId)`.

- [ ] **Step 5: Implement typed input and shared submission**

In `input.js`, populate a `<datalist>` with station names, resolve submitted text through `graph.resolveStation`, and pass the resolved station ID to the same callback used by the map. Preserve invalid text and return focus to the input after accepted desktop submissions. Convert resolution results into concise unknown/ambiguous messages; leave adjacency and repeat errors to the shared app handler.

- [ ] **Step 6: Connect the application**

In `app.js`, fetch `data/metro.json`, create the graph and game, and pass a single `selectStation(stationId)` callback to both input and map. After every result, update score, chain list, status text, controls, and map. Restart clears all state. Copy writes station names joined with ` → ` and announces success. On fetch failure, replace controls with a retry button and a plain-language error.

- [ ] **Step 7: Run automated tests and locally inspect the page**

Run:

```powershell
npm test
python -m unittest discover -s tests -p "test_*.py" -v
python -m http.server 8000 --directory public
```

Expected: all automated tests pass and `http://localhost:8000` loads without console errors.

- [ ] **Step 8: Commit the playable site**

```powershell
git add public/index.html public/styles.css public/js/map.js public/js/input.js public/js/app.js tests/ui-contract.test.mjs
git commit -m "feat: build interactive Metro chain site"
```

### Task 4: Validate real-network behavior and browser accessibility

**Files:**
- Create: `tests/production-network.test.mjs`
- Modify: `README.md`
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/js/map.js`
- Modify: `public/js/input.js`
- Modify: `public/js/app.js`

**Interfaces:**
- Consumes: complete static site and production graph.
- Produces: verified local release candidate.

- [ ] **Step 1: Add production graph regression tests**

Load `public/data/metro.json` and assert 16 lines, 324 stations, no self-edges, no dangling endpoints, unique undirected edge keys, and connected reachability across all 324 stations. Add named checks for branches and interchanges: La Fourche has both line 13 branch directions available, Maison Blanche connects line 7 and line 14 continuations through one station node, and Châtelet serves its recorded Métro lines.

- [ ] **Step 2: Run all automated verification**

Run:

```powershell
npm test
python -m unittest discover -s tests -p "test_*.py" -v
git diff --check
```

Expected: all tests pass and `git diff --check` prints nothing.

- [ ] **Step 3: Verify in a desktop browser**

Start `python -m http.server 8000 --directory public`. Check a typed chain and a clicked chain produce identical state, including `Nation → Avron → Alexandre Dumas`. Verify invalid, repeated, and non-adjacent stations; restart; copy; automatic completion; keyboard-only station selection; focus visibility; and absence of console errors.

- [ ] **Step 4: Verify at a narrow mobile viewport**

At 390×844, verify no horizontal page scrolling, readable controls, accessible station touch targets, automatic scrolling of the chain to its newest item, and visible error messages. Confirm reduced-motion mode removes nonessential animation.

- [ ] **Step 5: Update documentation with verified commands and limitations**

Record exact local-run and test commands, current graph counts, input behavior, source attribution, and the absence of timer, undo, persistence, and non-Métro modes.

- [ ] **Step 6: Run final verification and commit**

Run:

```powershell
npm test
python -m unittest discover -s tests -p "test_*.py" -v
git diff --check
git status --short
```

Expected: tests pass, no whitespace errors, and only intended files are changed.

```powershell
git add README.md tests/production-network.test.mjs public
git commit -m "test: verify Paris Metro chain release"
```
