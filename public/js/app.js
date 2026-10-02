import { createGame } from "./game.js";
import { createGraph } from "./graph.js";
import { createStationInput } from "./input.js";
import { createMetroMap } from "./map.js";

const elements = {
  form: document.querySelector("#station-form"),
  status: document.querySelector("#status"),
  score: document.querySelector("#score"),
  chain: document.querySelector("#chain-list"),
  chainMeta: document.querySelector("#chain-line"),
  restart: document.querySelector("#restart-button"),
  copy: document.querySelector("#copy-button"),
  loading: document.querySelector("#map-loading"),
  svg: document.querySelector("#metro-map"),
};

function setStatus(message, tone = "normal") {
  elements.status.textContent = message;
  elements.status.dataset.tone = tone;
}

async function start() {
  const response = await fetch("data/metro.json");
  if (!response.ok) throw new Error(`Network data request failed (${response.status})`);
  const graph = createGraph(await response.json());
  const game = createGame(graph);
  let map;

  function stationName(stationId) {
    return graph.stationById.get(stationId).name;
  }

  function render(state) {
    elements.score.value = state.score;
    elements.score.textContent = state.score;
    elements.copy.disabled = state.chain.length === 0;
    elements.chainMeta.textContent = state.chain.length === 0 ? "No stations yet" : `${state.chain.length} station${state.chain.length === 1 ? "" : "s"}`;
    elements.chain.replaceChildren();
    if (state.chain.length === 0) {
      const empty = document.createElement("li");
      empty.className = "chain-empty";
      empty.textContent = "Your route will appear here.";
      elements.chain.append(empty);
    } else {
      for (const stationId of state.chain) {
        const item = document.createElement("li");
        item.textContent = stationName(stationId);
        elements.chain.append(item);
      }
      elements.chain.lastElementChild?.scrollIntoView({ block: "nearest" });
    }
    map.render(state);
  }

  function selectStation(stationId) {
    const result = game.play(stationId);
    if (result.kind === "already-used") {
      setStatus(`${stationName(stationId)} is already in your chain.`, "error");
    } else if (result.kind === "not-adjacent") {
      setStatus(`${stationName(stationId)} is not one stop from ${stationName(result.state.current)}.`, "error");
    } else if (result.kind === "unknown-station") {
      setStatus("That station is not in this Métro network.", "error");
    } else {
      render(result.state);
      if (result.complete) {
        setStatus(`Dead end at ${stationName(result.current)}. Final score: ${result.score}.`, "complete");
      } else {
        setStatus(`${stationName(result.current)} added. ${result.validNext.length} unused neighbour${result.validNext.length === 1 ? "" : "s"} available.`);
      }
    }
    return result;
  }

  map = createMetroMap(elements.svg, graph, selectStation);
  const stationInput = createStationInput(elements.form, graph, selectStation);
  render(game.getState());
  elements.loading.remove();

  elements.form.addEventListener("station-input-error", (event) => setStatus(event.detail.message, "error"));
  elements.restart.addEventListener("click", () => {
    render(game.restart());
    stationInput.clear();
    setStatus("Choose any station to begin.");
    stationInput.focus();
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

start().catch((error) => {
  console.error(error);
  elements.loading.textContent = "The network could not be loaded.";
  elements.form.hidden = true;
  setStatus("The Métro data could not be loaded. Refresh the page to retry.", "error");
});
