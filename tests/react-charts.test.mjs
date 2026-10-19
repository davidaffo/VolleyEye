import {reference} from "./helpers/ui-reference.mjs";
import { sourceFunctions } from "./helpers/source-functions.mjs";
import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import { buildSync } from "esbuild";
import { JSDOM } from "jsdom";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url),
  module = { exports: {} };
const bundle = buildSync({
  entryPoints: [
    new URL("../src/components/SkillChart.jsx", import.meta.url).pathname,
  ],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",

  jsx: "automatic",
});
new Function("require", "module", "exports", bundle.outputFiles[0].text)(
  require,
  module,
  module.exports,
);
const source = readFileSync(
    new URL("../src/features/analysis/skill-chart-model.js", import.meta.url),
    "utf8",
  ),
  model = readFileSync(
    new URL("../src/features/analysis/chart-model.js", import.meta.url),
    "utf8",
  );
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
  ]);
  return {
    tag: node.tagName,
    attributes: Object.fromEntries(
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
for (const metric of [
  { id: "eff", kind: "percent" },
  { id: "pos", kind: "percent" },
  { id: "code", kind: "code" },
  { id: "total", kind: "count" },
])
  for (const group of [false, true])
    for (const length of [1, 6]) {
      test(`SVG React conserva geometria e dati: ${metric.id}, partite ${group}, punti ${length}`, () => {
        const series = Array.from({ length }, (_, index) => ({
          x: index + 1,
          y: [-2, 1, 0, 2, -1, 1][index],
          code: ["=", "+", "!", "#", "-", "+"][index],
          tone:
            index % 3 === 0
              ? "negative"
              : index % 3 === 1
                ? "positive"
                : "neutral",
          set: index < 3 ? 1 : 2,
          rotation: 2,
          labelValue: String(index),
          groupType: group ? "match" : undefined,
          matchLabel: group ? "Partita prova" : undefined,
          matchEventsCount: group ? 4 : undefined,
        }));
        const context = vm.createContext({
          getSkillChartMetricMeta: () => metric,
          getSkillMetricSeriesCached: () => series,
          getSkillChartToneColors: () => ({
            positive: "red",
            neutral: "yellow",
            negative: "blue",
          }),
          withAlpha: (color) => color,
          getSkillChartCodeTone: () => "neutral",
          Object,
          Number,
          Math,
        });
        vm.runInContext(
          sourceFunctions(source, ["getSkillChartLayout"]) +
            sourceFunctions(model, ["buildReactSkillChartModel"]),
          context,
        );
        const view = context.buildReactSkillChartModel({
          title: "Prova",
          tones: { positive: "red", neutral: "yellow", negative: "blue" },
          events: series,
          metricId: metric.id,
        });
        const react = new JSDOM(
          renderToStaticMarkup(
            createElement(module.exports.SkillChart, { model: view }),
          ),
        );
        assert.deepEqual(
          canonical(react.window.document.querySelector("svg")),
          reference("react-charts:3930"),
        );
      });
    }
