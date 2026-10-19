import {reference} from "./helpers/ui-reference.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import { JSDOM } from "jsdom";
const context = vm.createContext({});
for (const path of [
  "src/features/io/datavolley-skills.js",
  "src/features/io/datavolley-export.js",
  "src/features/io/datavolley-codec.js",
  "src/features/io/datavolley-live-entry.js",
  "src/features/scout/code-entry.js",
])
  vm.runInContext(readFileSync(path, "utf8"), context);
for (const code of [
  "",
  "*T",
  "aT",
  "*c0809",
  "*08SM#~~~15C",
  "a03RH+",
  "*12AQ#",
  "*08SM",
  "*",
  "*08",
  "codice-errato",
]) {
  test(`anteprima DataVolley React conserva gruppi, etichette e valori: ${code || "(vuoto)"}`, () => {
    const model = context.buildReactDvwBreakdown(code);
    const sections = model.groups;
    assert.equal(model.groups.length, reference("react-dvw-preview:908"));
    for (let i = 0; i < sections.length; i++) {
      assert.equal(
        model.groups[i].title,
        reference("react-dvw-preview:1014"),
      );
      if (model.groups[i].text)
        assert.equal(
          model.groups[i].text,
          reference("react-dvw-preview:1203"),
        );
      else
        assert.deepEqual(
          Array.from(model.groups[i].entries, (row) => [
            String(row.label),
            String(row.value || "—"),
          ]),
          reference("react-dvw-preview:1379"),
        );
    }
  });
}
