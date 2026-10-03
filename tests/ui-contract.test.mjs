import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("page exposes the accessible game controls", () => {
  const html = read("public/index.html");

  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
  assert.match(html, /id="choice-grid"/);
  assert.match(html, /id="line-filter"/);
  assert.match(html, /id="choices-title"/);
  assert.doesNotMatch(html, /id="station-input"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /id="score"/);
  assert.match(html, /href="rules\.html"[^>]*>How to play/);
  assert.doesNotMatch(html, /class="rules"/);
  assert.match(html, /id="restart-button"/);
  assert.match(html, /id="undo-button"/);
  assert.match(html, /id="copy-button"/);
  assert.match(html, /<svg[^>]+id="metro-map"/);
  assert.match(html, /<title[^>]*>.*Paris Métro/i);
  assert.match(html, /<desc[^>]*>/);
  assert.match(html, /class="skip-link"[^>]+href="#game-content"/);
  assert.match(html, /<main[^>]+id="game-content"/);
  assert.doesNotMatch(html, /<svg[^>]+role=/);
  assert.match(html, /id="retry-button"/);
  assert.match(html, /Paris Métro<br><span>Snake<\/span>/);
  for (const control of ["map-zoom-in", "map-zoom-out", "map-zoom-reset"]) {
    assert.match(html, new RegExp(`id="${control}"`));
  }
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

test("rules live on a separate concise page", () => {
  const rules = read("public/rules.html");
  assert.match(rules, /Paris Métro<br><span>Snake<\/span>/);
  assert.match(rules, /Build one continuous chain/);
  assert.match(rules, /No station can be touched twice/i);
  assert.match(rules, /164 stations/);
  assert.match(rules, /href="index\.html"/);
});

test("the playable panel occupies the first mobile screen", () => {
  const css = read("public/styles.css");
  const app = read("public/js/app.js");
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.game-panel\s*\{[^}]*grid-row:\s*1[^}]*height:\s*calc\(100(?:d)?vh\s*-\s*20px\)/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[\s\S]*\.map-panel\s*\{[^}]*grid-row:\s*2/);
  assert.match(app, /document\.body\.classList\.toggle\("game-started",\s*Boolean\(state\.current\)\)/);
});

test("a completed chain replaces empty choices with a result card", () => {
  const app = read("public/js/app.js");
  assert.match(app, /className\s*=\s*"completion-card"/);
  assert.match(app, /Snake complete/);
  assert.match(app, /Play again/);
  assert.match(app, /state\.score}\s*\/\s*\${maximumScore}/);
  assert.doesNotMatch(app, /No unused hub or terminus can be reached from here/);
});

test("undo control follows the game move history", () => {
  const app = read("public/js/app.js");
  assert.match(app, /undo:\s*document\.querySelector\("#undo-button"\)/);
  assert.match(app, /elements\.undo\.disabled\s*=\s*!state\.canUndo/);
  assert.match(app, /game\.undo\(\)/);
});

test("ordinary adjacent stations are presented as next-stop choices", () => {
  const app = read("public/js/app.js");
  const rules = read("public/rules.html");
  assert.match(app, /choice-card--next/);
  assert.match(app, /Next stop/);
  assert.match(rules, /next stop, or skip ahead/i);
});
