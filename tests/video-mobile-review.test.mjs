import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { readStyleSource } from "./helpers/style-source.mjs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const source = readScoutSource();
const css = readStyleSource();

test("la vista video mobile usa il player a tutta larghezza con navigazione sovrapposta", () => {
  assert.match(html, /class="video-mobile-overlay-nav video-mobile-only"/);
  assert.match(html, /id="video-mobile-prev"/);
  assert.match(html, /id="video-mobile-next"/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*#video-panel \.video-skills,[\s\S]*display: none !important/);
  assert.match(css, /#video-panel \.video-media \{[\s\S]*width: 100%/);
  assert.doesNotMatch(css, /orientation: landscape[\s\S]*video-player-wrap--analysis[\s\S]*grid-template-columns/);
  assert.match(source, /function selectVideoMobileEvent\(delta\)/);
});

test("filtri completi e preset restano disponibili nel foglio mobile", () => {
  assert.match(html, /id="video-mobile-filter-open"/);
  assert.match(html, /id="video-mobile-filter-apply"/);
  assert.match(html, /id="video-filter-presets-list"/);
  assert.match(css, /body\.video-mobile-filters-open #video-panel \.video-filters-panel/);
  assert.match(source, /function renderVideoFilterPresets\(\)/);
  assert.match(source, /function saveCurrentVideoFilterPreset\(\)/);
  assert.match(source, /function focusFirstFilteredVideoEventMobile\(options = \{\}\)/);
  assert.match(source, /focusFirstFilteredVideoEventMobile\(\{ userAction: true \}\)/);
});

test("senza sorgente la vista mobile propone file locale o YouTube", () => {
  assert.match(html, /id="video-mobile-source-modal"/);
  assert.match(html, /id="video-mobile-file-picker"/);
  assert.match(html, /id="video-mobile-youtube-url"/);
  assert.match(source, /function maybeOpenVideoMobileSourceModal\(\)/);
  assert.match(source, /function hasPlayableVideoSource\(\)/);
  assert.match(source, /scheduleVideoMobileSourcePrompt\(\)/);
});
