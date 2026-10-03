const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

export function hitRadiusForScale(scale) {
  return Math.max(11, 12 / scale);
}

function segmentKey(first, second) {
  return [first, second].sort().join("|");
}

function segmentStates(state) {
  const used = new Set();
  for (let index = 1; index < state.chain.length; index += 1) {
    used.add(segmentKey(state.chain[index - 1], state.chain[index]));
  }
  const available = new Set();
  for (const option of state.jumpOptions) {
    const route = [state.current, ...option.path];
    for (let index = 1; index < route.length; index += 1) {
      available.add(segmentKey(route[index - 1], route[index]));
    }
  }
  return { used, available };
}

export function edgeState(edge, state) {
  const states = segmentStates(state);
  const key = segmentKey(edge.station_a, edge.station_b);
  if (states.used.has(key)) return "used";
  if (states.available.has(key)) return "available";
  return "unused";
}

export function createMetroMap(svg, graph) {
  const content = svg.querySelector("#map-content");
  const lineById = new Map(graph.lines.map((line) => [line.id, line]));
  const longitudes = graph.stations.map((station) => station.longitude);
  const latitudes = graph.stations.map((station) => station.latitude);
  const bounds = {
    minLon: Math.min(...longitudes), maxLon: Math.max(...longitudes),
    minLat: Math.min(...latitudes), maxLat: Math.max(...latitudes),
  };
  const padding = 42;
  const width = 1000 - padding * 2;
  const height = 760 - padding * 2;
  const points = new Map();
  const stationElements = new Map();
  const edgeElements = [];
  const used = new Set();
  const hitTargets = [];
  let currentStationId = null;

  function project(station) {
    const x = padding + ((station.longitude - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * width;
    const y = padding + ((bounds.maxLat - station.latitude) / (bounds.maxLat - bounds.minLat)) * height;
    return { x, y };
  }

  for (const station of graph.stations) points.set(station.id, project(station));

  const edgeLayer = svgElement("g", { class: "edge-layer", "aria-hidden": "true" });
  for (const edge of graph.edges) {
    const first = points.get(edge.station_a);
    const second = points.get(edge.station_b);
    const color = lineById.get(edge.line_ids[0])?.color ?? "#7b8492";
    const element = svgElement("line", {
      class: "metro-edge",
      x1: first.x, y1: first.y, x2: second.x, y2: second.y,
      stroke: color,
    });
    edgeLayer.append(element);
    edgeElements.push({ edge, element });
  }
  content.append(edgeLayer);

  const stationLayer = svgElement("g", { class: "station-layer" });
  const labelLayer = svgElement("g", { class: "label-layer", "aria-hidden": "true" });

  function drawLabel(stationId) {
    labelLayer.replaceChildren();
    const station = graph.stationById.get(stationId);
    const point = points.get(stationId);
    const label = svgElement("text", { class: "station-label", x: point.x + 10, y: point.y - 10 });
    label.textContent = station.name;
    labelLayer.append(label);
  }

  function restoreLabel() {
    if (currentStationId) drawLabel(currentStationId);
    else labelLayer.replaceChildren();
  }

  for (const station of graph.stations) {
    const point = points.get(station.id);
    const group = svgElement("g", {
      class: "station",
      transform: `translate(${point.x} ${point.y})`,
    });
    const title = svgElement("title");
    title.textContent = station.name;
    const hitTarget = svgElement("circle", { class: "station__hit", r: 12 });
    group.append(title, hitTarget, svgElement("circle", { class: "station__dot", r: 3.4 }));
    hitTargets.push(hitTarget);
    group.addEventListener("mouseenter", () => drawLabel(station.id));
    group.addEventListener("mouseleave", restoreLabel);
    stationLayer.append(group);
    stationElements.set(station.id, group);
  }
  stationLayer.setAttribute("aria-hidden", "true");
  content.append(stationLayer, labelLayer);

  function updateHitTargets() {
    const scale = Math.abs(svg.getScreenCTM()?.a) || 1;
    const radius = hitRadiusForScale(scale);
    for (const hitTarget of hitTargets) hitTarget.setAttribute("r", radius);
  }
  updateHitTargets();
  if (typeof ResizeObserver !== "undefined") new ResizeObserver(updateHitTargets).observe(svg);

  function render(state) {
    currentStationId = state.current;
    used.clear();
    state.chain.forEach((stationId) => used.add(stationId));
    const valid = new Set(state.jumpOptions.map((option) => option.stationId));
    const atStart = state.chain.length === 0;
    for (const [stationId, element] of stationElements) {
      element.classList.toggle("station--current", stationId === state.current);
      element.classList.toggle("station--valid", valid.has(stationId));
      element.classList.toggle("station--used", used.has(stationId) && stationId !== state.current);
      element.classList.toggle("station--muted", !atStart && !valid.has(stationId) && !used.has(stationId));
    }
    const states = segmentStates(state);
    for (const { edge, element } of edgeElements) {
      const key = segmentKey(edge.station_a, edge.station_b);
      element.classList.toggle("metro-edge--used", states.used.has(key));
      element.classList.toggle("metro-edge--available", !states.used.has(key) && states.available.has(key));
      element.classList.toggle("metro-edge--unused", !states.used.has(key) && !states.available.has(key));
    }
    restoreLabel();
  }

  return { render };
}
