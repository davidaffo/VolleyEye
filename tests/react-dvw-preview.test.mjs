import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
const context = vm.createContext({});
for (const path of [
  "js/scout/io/datavolley-export.js",
  "js/scout/io/datavolley-codec.js",
  "js/scout/io/datavolley-live-entry.js",
  "src/compat/dvw-entry-adapter.js",
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
    const original = new JSDOM(context.buildDvwScoutBreakdown(code)).window
      .document;
    const model = context.buildReactDvwBreakdown(code);
    const sections = [...original.querySelectorAll("section")];
    assert.equal(model.groups.length, sections.length);
    for (let i = 0; i < sections.length; i++) {
      assert.equal(
        model.groups[i].title,
        sections[i].querySelector(".scout-dvw-breakdown__group-title")
          .textContent,
      );
      if (model.groups[i].text)
        assert.equal(
          model.groups[i].text,
          sections[i].querySelector(".scout-dvw-breakdown__command-text")
            .textContent,
        );
      else
        assert.deepEqual(
          Array.from(model.groups[i].entries, (row) => [
            String(row.label),
            String(row.value || "—"),
          ]),
          [...sections[i].querySelectorAll(".scout-dvw-breakdown__item")].map(
            (row) => [
              row.querySelector(".scout-dvw-breakdown__key").textContent,
              row.querySelector(".scout-dvw-breakdown__value").textContent,
            ],
          ),
        );
    }
  });
}
