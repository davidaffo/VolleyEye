import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const index = readFileSync("index.html", "utf8");
const themeCss = readFileSync("styles/light-theme.css", "utf8");
const skillPaletteCss = readFileSync("styles/skill-palette.css", "utf8");
const skillChartsCss = readFileSync("styles/skill-charts.css", "utf8");
const videoFiltersCss = readFileSync("styles/video-filters.css", "utf8");
const stateStore = readFileSync("js/roster/core/state-store.js", "utf8");
const globals = readFileSync("js/globals.js", "utf8");
const themeBindings = readFileSync("js/scout/core/bindings-roster.js", "utf8");
const matchIo = readFileSync("js/scout/io/match-io.js", "utf8");
const exportsSource = readFileSync("js/scout/io/exports.js", "utf8");
const serviceWorker = readFileSync("service-worker.js", "utf8");

function rgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16));
}

function luminance(hex) {
  const channels = rgb(hex).map(value => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("il completamento del tema chiaro viene caricato dopo tutti i componenti e resta offline", () => {
  const componentPosition = index.indexOf('"styles/scout-live.css"');
  const lightPosition = index.indexOf('"styles/light-theme.css"');
  const printPosition = index.indexOf('"styles/print.css"');
  assert.ok(componentPosition >= 0 && componentPosition < lightPosition);
  assert.ok(lightPosition < printPosition);
  assert.match(serviceWorker, /withVersion\("\.\/styles\/light-theme\.css"\)/);
  assert.match(serviceWorker, /"\/styles\/light-theme\.css"/);
  assert.match(serviceWorker, /withVersion\("\.\/styles\/skill-palette\.css"\)/);
});

test("il cambio tema aggiorna anche controlli nativi e colore della finestra", () => {
  assert.match(stateStore, /document\.documentElement\.style\.colorScheme = resolvedTheme/);
  assert.match(stateStore, /meta\[name="theme-color"\]/);
  assert.match(stateStore, /resolvedTheme === "light" \? "#f1f5f9" : "#111111"/);
});

test("il tema automatico segue il dispositivo e sincronizza entrambi i selettori", () => {
  assert.match(globals, /theme: "auto"/);
  assert.match(globals, /querySelectorAll\("\[data-theme-choice\]"\)/);
  assert.match(stateStore, /window\.matchMedia\("\(prefers-color-scheme: light\)"\)\.matches/);
  assert.match(stateStore, /document\.body\.dataset\.themePreference = preference/);
  assert.match(themeBindings, /deviceTheme\.addEventListener\("change", syncAutomaticTheme\)/);
  assert.match(themeBindings, /if \(state\.theme === "auto"\) applyTheme\("auto"\)/);
});

test("il tema è globale e non viene sostituito caricando o esportando una partita", () => {
  assert.match(stateStore, /THEME_PREFERENCE_KEY = "volleyeye-theme-preference"/);
  assert.match(stateStore, /state\.theme = globalThemePreference \|\| normalizeThemePreference\(parsed\.theme\)/);
  assert.match(matchIo, /const preservedTheme = getStoredThemePreference\(\)/);
  assert.match(matchIo, /merged\.theme = preservedTheme/);
  assert.match(matchIo, /applyTheme\(preservedTheme\)/);
  assert.match(exportsSource, /applyTheme\("light", \{ persistPreference: false \}\)/);
});

test("il tema chiaro copre shell, controlli, scout, analisi, video e modali", () => {
  const requiredSelectors = [
    ".tabs-nav.floating",
    "input:not([type=\"checkbox\"])",
    ".match-manager-panel",
    ".scout-widget",
    ".lineup-modal__court",
    ".court-card .event-btn.code-negative",
    ".metric-block",
    ".agg-subtab-btn",
    ".skill-chart-card",
    ".set-trend-card",
    ".play-by-play-token.is-positive",
    ".match-sheet-filter",
    ".settings-modal__content",
    ".team-modal__dialog",
    ".video-filter-presets-panel",
    ".video-analysis .video-table-wrapper",
    ".video-skills-table tbody tr:nth-child(odd)"
  ];
  requiredSelectors.forEach(selector => assert.ok(themeCss.includes(selector), `manca ${selector}`));
});

test("un'unica palette alimenta fondamentali in impostazioni, scout e analisi", () => {
  ["serve", "pass", "freeball", "attack", "defense", "block", "second"].forEach(skill => {
    assert.match(skillPaletteCss, new RegExp(`\\.skill-${skill}`));
    assert.match(
      index,
      new RegExp(`class="auto-rotate-toggle skill-${skill}"[^>]*>[\\s\\S]*?id="opponent-skill-${skill}"`)
    );
  });
  assert.match(skillPaletteCss, /\.metric-block\[class\*="skill-"\]/);
  assert.match(skillPaletteCss, /\.opponent-skill-toggles label\[class\*="skill-"\]/);
  assert.match(skillPaletteCss, /\.skill-col\[class\*="skill-"\]/);
  assert.match(skillPaletteCss, /\.skill-picker-btn/);
});

test("la zona più servita mantiene il contorno blu anche nel tema chiaro", () => {
  assert.match(
    skillChartsCss,
    /body\[data-theme="light"\] \.court-cell\.best-volume\s*\{[^}]*border-color:\s*#2563eb;[^}]*border-width:\s*2px;/s
  );
});

test("andamento set usa una palette tematica invece di colori grigi fissi", () => {
  assert.match(themeCss, /body\[data-theme="light"\] \.set-trend-panel\s*\{/);
  assert.match(
    themeCss,
    /--set-trend-plot-background:\s*linear-gradient\(to bottom, #bfdbfe 0%, #dbeafe 49\.5%, #fee2e2 50\.5%, #fecaca 100%\)/
  );
  assert.match(themeCss, /--set-trend-positive:\s*#15803d/);
  assert.match(themeCss, /--set-trend-negative:\s*#dc2626/);
  assert.match(themeCss, /--set-trend-label:\s*#334155/);
  assert.match(videoFiltersCss, /stroke:\s*var\(--set-trend-positive\)/);
  assert.match(videoFiltersCss, /fill:\s*var\(--set-trend-negative\)/);
  assert.match(videoFiltersCss, /background:\s*var\(--set-trend-plot-background\)/);
});

test("in analisi video player e tabella eventi iniziano sulla stessa riga", () => {
  assert.match(
    index,
    /<div class="video-analysis__actions">[\s\S]*?<div class="video-analysis__grid">/
  );
  assert.doesNotMatch(
    index,
    /<div class="video-player-wrap video-player-wrap--analysis">\s*<div class="video-analysis__actions">/
  );
});

test("le coppie principali del tema chiaro superano il contrasto WCAG AA", () => {
  const pairs = [
    ["#0f172a", "#ffffff"],
    ["#0f172a", "#f1f5f9"],
    ["#475569", "#f8fafc"],
    ["#ffffff", "#2563eb"],
    ["#1e3a8a", "#dbeafe"],
    ["#7f1d1d", "#fee2e2"],
    ["#ffffff", "#1b5e20"],
    ["#0f172a", "#f9a825"],
    ["#ffffff", "#a21caf"],
    ["#ffffff", "#b71c1c"],
    ["#ffffff", "#475569"],
    ["#ffffff", "#5b21b6"],
    ["#ffffff", "#0f766e"]
  ];
  pairs.forEach(([foreground, background]) => {
    assert.ok(
      contrast(foreground, background) >= 4.5,
      `${foreground} su ${background} non raggiunge 4.5:1`
    );
  });
});
