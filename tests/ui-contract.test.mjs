import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("page exposes the accessible game controls", () => {
  const html = read("public/index.html");

  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
  assert.match(html, /id="choice-grid"/);
  assert.match(html, /id="alphabet-filter"/);
  assert.match(html, /id="choices-title"/);
  assert.doesNotMatch(html, /id="station-input"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /id="score"/);
  assert.match(html, /Build one continuous chain/);
  assert.match(html, /no station can be touched twice/i);
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

test("square choice buttons drive starts and jumps", () => {
  const app = read("public/js/app.js");
  const css = read("public/styles.css");
  assert.match(app, /game\.start\(/);
  assert.match(app, /game\.jump\(/);
  assert.match(css, /\.choice-card/);
  assert.match(css, /\.choice-card\s*\{[^}]*min-height:\s*82px/s);
  assert.doesNotMatch(css, /aspect-ratio:\s*1/);
  assert.match(css, /\.game-panel\s*\{[^}]*min-width:\s*0/s);
  assert.match(app, /chain\.scrollTop\s*=\s*elements\.chain\.scrollHeight/);
  assert.doesNotMatch(app, /scrollIntoView/);
});

test("load failures expose a real retry action", () => {
  const app = read("public/js/app.js");

  assert.match(app, /retry\.addEventListener\("click"/);
  assert.match(app, /setControlsDisabled\(true\)/);
  assert.match(app, /await loadGame\(\)/);
  assert.match(app, /cache:\s*"no-store"/);
});

test("score is shown against the exact maximum", () => {
  const app = read("public/js/app.js");
  assert.match(app, /metadata\.maximum_score/);
  assert.match(app, /state\.score}\s*\/\s*\${maximumScore}/);
});
