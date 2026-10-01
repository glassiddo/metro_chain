# Paris Métro Chain — Design

## Purpose

Paris Métro Chain is an untimed route-building game inspired by JetPunk's country-chain quiz. A player starts at any Paris Métro station and repeatedly chooses an unused station directly adjacent to the current station. The run ends when the current station has no unused neighbours.

The first release will be a standalone static website. It will use a small derived dataset copied from the existing Chronométro project while leaving that project unchanged.

## Scope

The game includes all 16 current Paris Métro lines: 1–14, 3bis, and 7bis. It excludes RER, tram, rail, buses, walking connections between separately named stations, and future unopened services.

The source snapshot contains 324 normalized Métro station complexes and 37 directional branch patterns. Interchange platforms belonging to one station complex are represented as one playable station.

The first release includes:

- typed station entry;
- station selection by clicking the map;
- highlighted valid neighbours;
- current, used, available, and unavailable station states;
- chain length as the score;
- automatic dead-end detection;
- restart and copy-chain controls;
- case-, accent-, and punctuation-insensitive station matching;
- responsive desktop and mobile layouts;
- local-only gameplay with no account or backend.

The first release does not include a timer, undo, hints beyond valid-neighbour highlighting, online leaderboards, persistent statistics, daily challenges, or multiple transport modes.

## Game Rules

1. The first move may select any station.
2. Every later move must select a station joined to the current station by a direct consecutive-stop edge on at least one Métro line.
3. A station may appear only once in a chain.
4. A move is valid regardless of which line supplied the previous edge; interchange stations allow the chain to continue along any Métro line serving that station.
5. If multiple lines directly connect the same station pair, the graph stores one edge with all applicable line identifiers.
6. The run ends immediately when the current station has no unused neighbouring stations.
7. The score is the number of stations in the completed or current chain.

Typing and clicking invoke the same validation path. Invalid typed names remain visible with a concise error. Invalid map clicks do not change the chain and provide visible feedback.

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
- `game.js` owns the chain state and implements move validation, scoring, restart, and dead-end detection.
- `map.js` projects station coordinates into SVG space, draws line segments and station markers, and updates visual states.
- `input.js` handles typed suggestions, submission, keyboard interaction, and shared error messages.
- `app.js` connects the modules and renders the chain and controls.

The game engine has no DOM dependency. It accepts station IDs and returns state transitions, allowing rules to be tested independently from the interface.

## Map and Interaction Design

The map is an original geographic rendering generated from station coordinates and graph edges. Edges use their Métro line colours. Shared edges may use a neutral treatment or parallel strokes where legibility permits. Station labels appear selectively to avoid clutter; focused, hovered, current, and valid-neighbour stations always show their names.

At the start, all stations are selectable. After the first move:

- the current station is visually dominant;
- unused adjacent stations are highlighted and clickable;
- previous stations remain visible as the chain;
- other stations and edges are muted;
- the input remains focused on desktop after every move.

On mobile, the map sits above a compact input and chain panel. Touch targets are enlarged independently of marker size. The chain panel scrolls to the latest move.

The typed input offers matching station suggestions but does not reveal whether a suggestion is a legal next move until submitted. This preserves recall while the map still communicates valid click targets.

## Error Handling

The interface distinguishes these cases:

- unknown station name;
- ambiguous normalized name;
- known station that is not adjacent;
- station already used;
- data load failure.

Errors are announced accessibly and do not discard the player's existing chain. A data load failure replaces the game controls with a retry message.

## Accessibility

All game actions are keyboard accessible. Station markers are buttons in the SVG accessibility tree, with station name, served lines, and current availability in their labels. Colour is never the sole indication of state. Focus rings, status text, and adequate touch targets are required.

Reduced-motion preferences disable nonessential transitions. The interface uses French station names but English game instructions initially; the text is kept centralized so French localization can be added later.

## Verification

Automated checks cover:

- deterministic data extraction;
- exactly 16 Métro routes and 324 station complexes from the current source snapshot;
- no self-edges or dangling station references;
- symmetric adjacency and deduplicated edges;
- representative branches and interchanges;
- name normalization and aliases;
- valid, invalid, repeated, and terminal moves in the game engine;
- equivalent outcomes for typed and clicked moves.

Browser verification covers desktop and narrow mobile layouts, keyboard-only play, map clicking, restart, copy-chain behaviour, and automatic completion at a dead end.

## Delivery

The site will run locally through a small static development server and remain deployable as plain static files. Hosting and public analytics are separate follow-up decisions after local playtesting.

The copied dataset will include attribution to Île-de-France Mobilités and ITO World consistent with the source project's documented provenance. The interface will state that the game is independent and is not affiliated with or endorsed by RATP or Île-de-France Mobilités.
