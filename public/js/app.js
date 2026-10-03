import { createGame } from "./game.js?v=20261003e";
import { createGraph } from "./graph.js?v=20261003e";
import { createMetroMap } from "./map.js?v=20261003e";
import { stationsForLine } from "./start-selector.js?v=20261003e";

const elements = {
  status: document.querySelector("#status"),
  score: document.querySelector("#score"),
  chain: document.querySelector("#chain-list"),
  chainMeta: document.querySelector("#chain-line"),
  choices: document.querySelector("#choice-grid"),
  choicesTitle: document.querySelector("#choices-title"),
  choicesMeta: document.querySelector("#choices-meta"),
  lineFilter: document.querySelector("#line-filter"),
  restart: document.querySelector("#restart-button"),
  undo: document.querySelector("#undo-button"),
  copy: document.querySelector("#copy-button"),
  loading: document.querySelector("#map-loading"),
  loadingMessage: document.querySelector("#loading-message"),
  retry: document.querySelector("#retry-button"),
  zoomIn: document.querySelector("#map-zoom-in"),
  zoomOut: document.querySelector("#map-zoom-out"),
  zoomReset: document.querySelector("#map-zoom-reset"),
  svg: document.querySelector("#metro-map"),
};

function setStatus(message, tone = "normal") {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

function setControlsDisabled(disabled) {
  elements.restart.disabled = disabled;
  elements.undo.disabled = disabled || elements.undo.disabled;
  elements.copy.disabled = disabled || elements.copy.disabled;
  for (const button of document.querySelectorAll(".choice-card, .line-filter button")) {
    button.disabled = disabled;
  }
}

async function loadGame() {
  const response = await fetch("data/metro.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Network data request failed (${response.status})`);
  const graph = createGraph(await response.json());
  const maximumScore = graph.metadata.maximum_score;
  const game = createGame(graph);
  const lineById = new Map(graph.lines.map((line) => [line.id, line]));
  const stations = [...graph.stations].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  let selectedLineId = graph.lines[0].id;

  const stationName = (stationId) => graph.stationById.get(stationId).name;

  function button(label, className, onClick) {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.append(label);
    element.addEventListener("click", onClick);
    return element;
  }

  function renderLineFilter() {
    elements.lineFilter.replaceChildren();
    for (const line of graph.lines) {
      const lineButton = button(line.name, "line-button", () => {
        selectedLineId = line.id;
        render(game.getState());
      });
      lineButton.style.setProperty("--line-color", line.color);
      lineButton.setAttribute("aria-label", `Line ${line.name}`);
      lineButton.setAttribute("aria-pressed", String(line.id === selectedLineId));
      elements.lineFilter.append(lineButton);
    }
  }

  function renderStartChoices() {
    const selectedLine = lineById.get(selectedLineId);
    elements.choicesTitle.textContent = "Choose a starting station";
    elements.choicesMeta.textContent = `Line ${selectedLine.name}`;
    elements.lineFilter.hidden = false;
    renderLineFilter();
    for (const station of stationsForLine(graph, selectedLineId).sort((a, b) => a.name.localeCompare(b.name, "fr"))) {
      const name = document.createElement("span");
      name.className = "choice-card__name";
      name.textContent = station.name;
      elements.choices.append(button(name, "choice-card choice-card--start", () => {
        const result = game.start(station.id);
        render(result.state);
        setStatus(`${station.name} selected. Choose a hub or terminus to jump to.`);
      }));
    }
  }

  function renderJumpChoices(state) {
    if (state.complete) {
      elements.choicesTitle.textContent = "Snake complete";
      elements.choicesMeta.textContent = "Final result";
      elements.lineFilter.hidden = true;
      const result = document.createElement("div");
      result.className = "completion-card";
      const score = document.createElement("strong");
      score.textContent = `${state.score} / ${maximumScore}`;
      const message = document.createElement("p");
      message.textContent = "No unused route remains. How long can your next snake be?";
      const actions = document.createElement("div");
      actions.className = "completion-card__actions";
      actions.append(
        button("Play again", "completion-card__primary", () => elements.restart.click()),
        button("Copy result", "completion-card__secondary", () => elements.copy.click()),
      );
      result.append(score, message, actions);
      elements.choices.append(result);
      return;
    }

    elements.choicesTitle.textContent = "Next choices";
    elements.choicesMeta.textContent = `${state.jumpOptions.length} available`;
    elements.lineFilter.hidden = true;

    for (const option of state.jumpOptions) {
      const line = lineById.get(option.lineId);
      const destination = graph.stationById.get(option.stationId);
      const isNextStop = option.path.length === 1 && destination.line_ids.length === 1;
      const name = document.createElement("span");
      name.className = "choice-card__name";
      name.textContent = destination.name;
      const detail = document.createElement("span");
      detail.className = "choice-card__detail";
      const lineBadge = document.createElement("span");
      lineBadge.className = "line-badge";
      lineBadge.style.setProperty("--line-color", line.color);
      lineBadge.textContent = isNextStop ? `Next stop · Line ${line.name}` : `Line ${line.name}`;
      const gain = document.createElement("strong");
      gain.textContent = `+${option.path.length}`;
      detail.append(lineBadge, gain);

      const choice = button(name, `choice-card${isNextStop ? " choice-card--next" : ""}`, () => {
        const from = state.current;
        const result = game.jump(option);
        if (result.kind !== "accepted") return;
        render(result.state);
        setStatus(
          result.complete
            ? `Snake complete — ${result.score} / ${maximumScore} stations.`
            : `${stationName(from)} → ${stationName(option.stationId)} via line ${line.name} · ` +
              `${result.addedCount} station${result.addedCount === 1 ? "" : "s"} added.`,
          result.complete ? "complete" : "normal",
        );
      });
      choice.append(detail);
      elements.choices.append(choice);
    }

  }

  function renderChain(state) {
    elements.chain.replaceChildren();
    if (!state.chain.length) {
      const empty = document.createElement("li");
      empty.className = "chain-empty";
      empty.textContent = "Your route will appear here.";
      elements.chain.append(empty);
      return;
    }
    for (const stationId of state.chain) {
      const item = document.createElement("li");
      item.textContent = stationName(stationId);
      elements.chain.append(item);
    }
    elements.chain.scrollTop = elements.chain.scrollHeight;
  }

  const map = createMetroMap(elements.svg, graph);
  elements.zoomIn.addEventListener("click", map.zoomIn);
  elements.zoomOut.addEventListener("click", map.zoomOut);
  elements.zoomReset.addEventListener("click", map.resetView);

  function render(state) {
    document.body.classList.toggle("game-started", Boolean(state.current));
    elements.score.value = state.score;
    elements.score.textContent = `${state.score} / ${maximumScore}`;
    elements.copy.disabled = !state.chain.length;
    elements.undo.disabled = !state.canUndo;
    elements.chainMeta.textContent = state.chain.length
      ? `${state.chain.length} station${state.chain.length === 1 ? "" : "s"}`
      : "No stations yet";
    elements.choices.replaceChildren();
    if (state.current) renderJumpChoices(state);
    else renderStartChoices();
    renderChain(state);
    map.render(state);
  }

  render(game.getState());
  elements.loading.hidden = true;
  setControlsDisabled(false);

  elements.restart.addEventListener("click", () => {
    selectedLineId = graph.lines[0].id;
    render(game.restart());
    setStatus("Choose a starting station.");
    elements.choices.querySelector("button")?.focus();
  });
  elements.undo.addEventListener("click", () => {
    const result = game.undo();
    if (result.kind !== "accepted") return;
    render(result.state);
    setStatus("Last move undone.");
  });
  elements.copy.addEventListener("click", async () => {
    const names = game.getState().chain.map(stationName);
    try {
      await navigator.clipboard.writeText(names.join(" → "));
      setStatus("Chain copied to the clipboard.");
    } catch {
      setStatus("The chain could not be copied. Select it from the list instead.", "error");
    }
  });
}

async function start() {
  elements.loading.hidden = false;
  elements.loadingMessage.textContent = "Drawing the network…";
  elements.retry.hidden = true;
  setControlsDisabled(true);
  try {
    await loadGame();
  } catch (error) {
    console.error(error);
    elements.loadingMessage.textContent = "The network could not be loaded.";
    elements.retry.hidden = false;
    setControlsDisabled(true);
    setStatus("The Métro data could not be loaded. Try loading it again.", "error");
  }
}

elements.retry.addEventListener("click", start);
start();
