const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  return element;
}

export function nearestStation(points, stationIds, target) {
  let nearestId = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const stationId of stationIds) {
    const point = points.get(stationId);
    const distance = Math.hypot(point.x - target.x, point.y - target.y);
    if (distance < nearestDistance) {
      nearestId = stationId;
      nearestDistance = distance;
    }
  }
  return nearestId;
}

export function hitRadiusForScale(scale) {
  return Math.max(11, 12 / scale);
}

export function createMetroMap(svg, graph, onStationSelect) {
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
  const actionableIds = new Set();
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

  function selectPointerStation(event) {
    const screenPoint = svg.createSVGPoint();
    screenPoint.x = event.clientX;
    screenPoint.y = event.clientY;
    const mapPoint = screenPoint.matrixTransform(svg.getScreenCTM().inverse());
    const stationId = nearestStation(points, actionableIds, mapPoint);
    if (stationId) onStationSelect(stationId);
  }

  for (const station of graph.stations) {
    const point = points.get(station.id);
    const group = svgElement("g", {
      class: "station",
      role: "button",
      tabindex: "0",
      transform: `translate(${point.x} ${point.y})`,
      "aria-label": `${station.name}, lines ${station.line_ids.map((id) => lineById.get(id)?.name).join(", ")}`,
    });
    const title = svgElement("title");
    title.textContent = station.name;
    const hitTarget = svgElement("circle", { class: "station__hit", r: 12 });
    group.append(title, hitTarget, svgElement("circle", { class: "station__dot", r: 3.4 }));
    hitTargets.push(hitTarget);
    group.addEventListener("mouseenter", () => drawLabel(station.id));
    group.addEventListener("focus", () => drawLabel(station.id));
    group.addEventListener("mouseleave", restoreLabel);
    group.addEventListener("blur", restoreLabel);
    group.addEventListener("click", (event) => {
      if (group.dataset.actionable === "true") selectPointerStation(event);
    });
    group.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && group.dataset.actionable === "true") {
        event.preventDefault();
        onStationSelect(station.id);
      }
    });
    stationLayer.append(group);
    stationElements.set(station.id, group);
  }
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
    actionableIds.clear();
    state.chain.forEach((stationId) => used.add(stationId));
    const valid = new Set(state.validNext);
    const atStart = state.chain.length === 0;
    for (const [stationId, element] of stationElements) {
      const actionable = atStart || valid.has(stationId);
      element.classList.toggle("station--current", stationId === state.current);
      element.classList.toggle("station--valid", valid.has(stationId));
      element.classList.toggle("station--used", used.has(stationId) && stationId !== state.current);
      element.classList.toggle("station--muted", !atStart && !valid.has(stationId) && !used.has(stationId));
      element.dataset.actionable = String(actionable);
      if (actionable) actionableIds.add(stationId);
      element.setAttribute("tabindex", actionable ? "0" : "-1");
      element.setAttribute("aria-disabled", String(!actionable));
    }
    for (const { edge, element } of edgeElements) {
      const active = atStart || used.has(edge.station_a) || used.has(edge.station_b) || valid.has(edge.station_a) || valid.has(edge.station_b);
      element.classList.toggle("metro-edge--muted", !active);
    }
    restoreLabel();
  }

  return { render };
}
