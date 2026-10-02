# Paris Métro Chain — Design

## Purpose

Paris Métro Chain is an untimed route-building game inspired by JetPunk's country-chain quiz. A player starts at any Paris Métro station and jumps along a line to later interchanges or termini. Every intermediate stop is collected automatically. The run ends when no offered jump avoids the stations already used.

The first release will be a standalone static website. It will use a small derived dataset copied from the existing Chronométro project while leaving that project unchanged.

## Scope

The game includes all 16 current Paris Métro lines: 1–14, 3bis, and 7bis. It excludes RER, tram, rail, buses, walking connections between separately named stations, and future unopened services.

The source snapshot yields 321 normalized Métro station complexes after duplicate records and the split Montparnasse naming are merged, plus 37 directional branch patterns. Interchange platforms belonging to one station complex are represented as one playable station.

The first release includes:

- square click-only station choices;
- alphabetic starting-station filters;
- jump rewards showing the number of intermediate stations collected;
- highlighted jump destinations on a geographic route map;
- current, used, available, and unavailable station states;
- chain length as the score;
- automatic dead-end detection;
- restart and copy-chain controls;
- responsive desktop and mobile layouts;
- local-only gameplay with no account or backend.

The first release does not include a timer, undo, hints beyond valid-neighbour highlighting, online leaderboards, persistent statistics, daily challenges, or multiple transport modes.

## Game Rules

1. The first move may select any station.
2. Every later move selects any downstream interchange or terminus reachable along one line.
3. Every consecutive stop between the current station and destination is added to the chain and score.
4. A jump is unavailable when its path crosses a station already used.
5. Interchange stations allow the next jump to use any Métro line serving that station.
6. When several routes reach the same destination, the shortest valid route is offered.
7. The run ends when the current station has no valid jump destination.
8. The score is the number of stations in the completed or current chain.

All moves use visible buttons. Starting stations are grouped by initial letter; later buttons show destination, line, and stations gained.

## Data Extraction

The existing file `C:\Users\iddo2\Dropbox\metro\public\data\paris\network.json` is an input only. No file in `C:\Users\iddo2\Dropbox\metro` will be changed.

A one-time extraction script in this project will:

1. Select routes whose mode is `metro`.
2. Select directional patterns belonging to those routes.
3. Turn each consecutive station pair in each pattern into an undirected edge.
4. Deduplicate station pairs while retaining every line serving the pair.
5. Select station complexes used by those edges.
6. Copy station names, coordinates, and served line identifiers.
7. Generate normalized lookup keys and a small explicit alias table for common acceptable spellings.
8. Emit a deterministic browser-ready JSON file.

Generated data will contain:

```text
metadata
  source_snapshot
  generated_at
  station_count
  edge_count

lines[]
  id
  name
  color

stations[]
  id
  name
  normalized_names[]
  latitude
  longitude
  line_ids[]

edges[]
  station_a
  station_b
  line_ids[]
```

The website will load only this derived file. It will never read from the other project at runtime.

## Architecture

The project will use a lightweight static stack: semantic HTML, CSS, and browser JavaScript modules. No bundler, framework, server, or external map library is required for the first release.

The code is divided into focused modules:

- `graph.js` loads and indexes stations, edges, aliases, and adjacency.
- `jumps.js` finds downstream interchanges and termini on each line and returns their complete paths.
- `game.js` owns the chain state and implements start, jump validation, scoring, restart, and dead-end detection.
- `map.js` projects station coordinates into SVG space, draws line segments and station markers, and updates route states.
- `app.js` connects the modules and renders the square choices, chain, and controls.

The game engine has no DOM dependency. It accepts station IDs and returns state transitions, allowing rules to be tested independently from the interface.

## Map and Interaction Design

The map is an original geographic rendering generated from station coordinates and graph edges. Edges use their Métro line colours. Station labels appear selectively to avoid clutter. The map shows route context; the square button grid is the primary game control.

At the start, alphabet buttons reveal square starting-station buttons. After the first move:

- the current station is visually dominant;
- every valid downstream interchange or terminus appears as a square choice showing its line and reward;
- available destinations are highlighted on the map;
- previous stations remain visible as the chain;
- other stations and edges are muted;

On mobile, the map sits above the choice and chain panel. The square choices remain large enough for touch, and the chain panel scrolls to the latest move.

## Error Handling

The interface prevents invalid moves by rendering only valid choices. It reports terminal routes and data-load failures.

Errors are announced accessibly and do not discard the player's existing chain. A data load failure replaces the game controls with a retry message.

## Accessibility

All game actions are native buttons and keyboard accessible. Choice cards name the station, line, and reward in text. Colour is never the sole indication of state. Focus rings, status text, and adequate touch targets are required.

Reduced-motion preferences disable nonessential transitions. The interface uses French station names but English game instructions initially; the text is kept centralized so French localization can be added later.

## Verification

Automated checks cover:

- deterministic data extraction;
- exactly 16 Métro routes and 321 station complexes from the current source snapshot;
- no self-edges or dangling station references;
- symmetric adjacency and deduplicated edges;
- representative branches and interchanges;
- name normalization and aliases;
- downstream hub and terminus discovery on each served line;
- intermediate-station scoring, blocked used paths, invalid jumps, and terminal states.

Browser verification covers desktop and narrow mobile layouts, keyboard-only buttons, start filtering, multi-station jumps, restart, copy-chain behaviour, and automatic completion at a dead end.

## Delivery

The site will run locally through a small static development server and remain deployable as plain static files. Hosting and public analytics are separate follow-up decisions after local playtesting.

The copied dataset will include attribution to Île-de-France Mobilités and ITO World consistent with the source project's documented provenance. The interface will state that the game is independent and is not affiliated with or endorsed by RATP or Île-de-France Mobilités.
