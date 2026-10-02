export function createStationInput(form, graph, onStationSelect) {
  const input = form.querySelector("#station-input");
  const datalist = form.querySelector("#station-list");

  const fragment = document.createDocumentFragment();
  for (const station of [...graph.stations].sort((a, b) => a.name.localeCompare(b.name, "fr"))) {
    const option = document.createElement("option");
    option.value = station.name;
    fragment.append(option);
  }
  datalist.replaceChildren(fragment);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const resolution = graph.resolveStation(input.value);
    if (resolution.kind === "unknown") {
      form.dispatchEvent(new CustomEvent("station-input-error", { bubbles: true, detail: { message: `No station matches “${input.value.trim()}”.` } }));
      return;
    }
    if (resolution.kind === "ambiguous") {
      const names = resolution.stationIds.map((id) => graph.stationById.get(id).name).join(" or ");
      form.dispatchEvent(new CustomEvent("station-input-error", { bubbles: true, detail: { message: `Please choose between ${names}.` } }));
      return;
    }
    const result = onStationSelect(resolution.stationId);
    if (result.kind === "accepted") input.value = "";
    input.focus();
  });

  return {
    clear: () => { input.value = ""; },
    focus: () => input.focus(),
  };
}
