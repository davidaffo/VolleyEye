import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { buildSync } from "esbuild";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url),
  read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
function component(name) {
  const module = { exports: {} },
    result = buildSync({
      entryPoints: [
        new URL(`../src/components/${name}.jsx`, import.meta.url).pathname,
      ],
      bundle: true,
      write: false,
      platform: "node",
      format: "cjs",
      packages: "external",
      external: ["virtual:volleyeye-runtime"],
      jsx: "automatic",
    });
  new Function("require", "module", "exports", result.outputFiles[0].text)(
    require,
    module,
    module.exports,
  );
  return module.exports;
}
const { MatchSheetCourt } = component("MatchSheet"),
  { SetTrendCard } = component("SetTrend");
function canonical(node) {
  const numeric = new Set([
    "x",
    "y",
    "x1",
    "x2",
    "y1",
    "y2",
    "cx",
    "cy",
    "width",
    "height",
    "r",
    "rx",
    "ry",
    "opacity",
    "stroke-width",
  ]);
  return {
    tag: node.tagName,
    attrs: Object.fromEntries(
      [...node.attributes]
        .map((attr) => [
          attr.name,
          numeric.has(attr.name)
            ? Number(attr.value)
            : attr.name === "points"
              ? attr.value.split(/[ ,]+/).map(Number)
              : attr.value,
        ])
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
    children: [...node.childNodes]
      .map((child) =>
        child.nodeType === 1 ? canonical(child) : child.textContent.trim(),
      )
      .filter(Boolean),
  };
}
for (const options of [
  { variant: "serve" },
  { variant: "attack", sourceZone: 4 },
  {
    fullCourt: true,
    playersSide: "far",
    players: [{ point: { x: 15, y: 80 }, label: "9", role: "P" }],
  },
  { fullCourt: true, noteKey: "test", title: "P1" },
])
  test(`campi scheda partita React: geometria ${JSON.stringify(options)}`, () => {
    const context = vm.createContext({
      state: {},
      MATCH_SHEET_COURT_HEIGHT: 200,
      MATCH_SHEET_FAR_COURT_ZONES: { 4: { x: 82, y: 76 } },
      MATCH_SHEET_NEAR_COURT_ZONES: {},
      getTrajectoryColorForCode: (code) => (code === "#" ? "green" : "red"),
      escapeDvwScoutHtml: (value) => String(value),
    });
    vm.runInContext(
      read("../js/scout/analysis/match-sheet.js") +
        read("../src/compat/match-sheet-adapter.js"),
      context,
    );
    const trajectories = Array.from({ length: 32 }, (_, index) => ({
        start: { x: 10 + index, y: 30 + index },
        end: { x: 80 - index, y: 160 - index },
        code: index % 2 ? "#" : "=",
      })),
      legacy = new JSDOM(
        context.renderMatchSheetCourtSvg(trajectories, options),
      ),
      react = new JSDOM(
        renderToStaticMarkup(
          createElement(MatchSheetCourt, {
            court: context.buildReactMatchSheetCourt(trajectories, options),
          }),
        ),
      );
    assert.deepEqual(
      canonical(react.window.document.querySelector("svg")),
      canonical(legacy.window.document.querySelector("svg")),
    );
  });
for (const count of [2, 6, 25])
  for (const selection of ["", "point2"])
    test(`andamento set React: ${count} punti, selezione ${selection}`, () => {
      const dom = new JSDOM(""),
        context = vm.createContext({
          document: dom.window.document,
          setTrendSelectionKey: selection,
          formatDelta: (value) => (value > 0 ? "+" + value : String(value)),
          computeSetTrendTickIndexes: (points) => [0, points.length - 1],
          requestAnimationFrame: () => {},
        });
      vm.runInContext(
        read("../js/scout/live/score-analysis.js") +
          read("../src/compat/set-trend-adapter.js"),
        context,
      );
      const points = Array.from({ length: count }, (_, index) => ({
          x: index,
          diff: [0, 1, -1, 3, -2, 2][index % 6],
          label: `${index + 1}-${index}`,
          tone: index % 2 ? "positive" : "negative",
          ev: index ? {} : null,
          pointKey: `point${index}`,
        })),
        group = { title: "Set 1", points, maxAbs: 3, final: points.at(-1) },
        legacy = context.renderSetTrendChartCard(group),
        react = new JSDOM(
          renderToStaticMarkup(
            createElement(SetTrendCard, {
              card: context.buildReactSetTrendCard(group),
              selection,
            }),
          ),
        );
      assert.deepEqual(
        canonical(react.window.document.querySelector("svg")),
        canonical(legacy.querySelector("svg")),
      );
    });
