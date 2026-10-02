import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("page exposes the accessible game controls", () => {
  const html = read("public/index.html");

  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
  assert.match(html, /<label[^>]+for="station-input"/);
  assert.match(html, /id="station-input"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /id="score"/);
  assert.match(html, /id="restart-button"/);
  assert.match(html, /id="copy-button"/);
  assert.match(html, /<svg[^>]+id="metro-map"/);
  assert.match(html, /<title[^>]*>.*Paris Métro/i);
  assert.match(html, /<desc[^>]*>/);
  assert.match(html, /class="skip-link"[^>]+href="#game-content"/);
  assert.match(html, /<main[^>]+id="game-content"/);
  assert.doesNotMatch(html, /<svg[^>]+role=/);
  assert.match(html, /id="retry-button"/);
});

test("styles cover responsive, focus, motion, and station states", () => {
  const css = read("public/styles.css");

  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  for (const state of ["current", "valid", "used", "muted"]) {
    assert.match(css, new RegExp(`station--${state}`));
  }
});

test("both station inputs use the same app selection callback", () => {
  const app = read("public/js/app.js");
  assert.match(app, /createMetroMap\([^;]+selectStation/s);
  assert.match(app, /createStationInput\([^;]+selectStation/s);
});

test("restart clears stale typed input through the input controller", () => {
  const input = read("public/js/input.js");
  const app = read("public/js/app.js");

  assert.match(input, /clear:\s*\(\)\s*=>/);
  assert.match(app, /stationInput\.clear\(\)/);
});

test("load failures expose a real retry action", () => {
  const app = read("public/js/app.js");

  assert.match(app, /retry\.addEventListener\("click"/);
  assert.match(app, /setControlsDisabled\(true\)/);
  assert.match(app, /await loadGame\(\)/);
  assert.match(app, /cache:\s*"no-store"/);
});
