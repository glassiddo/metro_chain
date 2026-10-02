# Paris Métro Chain

Build the longest possible chain of Paris Métro stations. Start anywhere, then
jump along a line to a later interchange or terminus. Every intermediate stop
is added to the route, and a jump cannot cross a station already used.

Play entirely with square choice buttons. Starting stations are grouped by
letter; later buttons show the destination, line, and number of stations the
jump adds. The map displays the route and available destinations. The game is
untimed; chain length is the score. The current version has no undo, persistent
statistics, daily challenge, or non-Métro modes.

## Data

The browser uses `public/data/metro.json`, a fixed derivative of Chronométro's
Paris network snapshot `20260630_200738`. That snapshot is based on an ITO
World modified GTFS export derived from Île-de-France Mobilités data.

`C:\Users\iddo2\Dropbox\metro` is an input-only source and must remain
read-only. Regenerate the browser dataset with the bundled Python runtime:

```powershell
& 'C:\Users\iddo2\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\extract_metro.py `
  --source 'C:\Users\iddo2\Dropbox\metro\public\data\paris\network.json' `
  --output public\data\metro.json
```

The generated graph contains 321 station complexes, 381 undirected
consecutive-stop edges, and lines 1–14, 3bis, and 7bis. RER, tram, other rail,
buses, and walking links between separately named stations are excluded.

## Run locally

From the repository root:

```powershell
& 'C:\Users\iddo2\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 8000 --directory public
```

Then open `http://localhost:8000`.

## Tests

```powershell
& 'C:\Users\iddo2\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m unittest discover -s tests -p 'test_*.py' -v
& 'C:\Users\iddo2\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests\*.test.mjs
```

## Attribution

Transit data: Île-de-France Mobilités and ITO World. Paris Métro Chain is
independent and is not affiliated with or endorsed by RATP or Île-de-France
Mobilités.
