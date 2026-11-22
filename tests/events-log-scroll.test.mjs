import { featureSource } from "./helpers/feature-source.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { readScoutSource } from "./helpers/scout-source.mjs";
import { sourceFunctions } from "./helpers/source-functions.mjs";
import { readSourceFixture } from "./helpers/source-fixture.mjs";

const source = featureSource("src/features/events/log-view.js");

test("il registro porta l'ultima riga in vista dopo inserimento e ricostruzione, rispettando suppressScroll", () => {
  const dom = new JSDOM('<div id="events-log"></div>');
  const log = dom.window.document.getElementById("events-log");
  const frames = [];
  const scrolledRows = [];
  dom.window.HTMLElement.prototype.scrollIntoView = function (options) {
    scrolledRows.push({ id: this.dataset.eventId, options });
  };
  Object.defineProperty(log, "scrollHeight", { get: () => log.querySelectorAll("tbody tr").length * 50 });
  const c = {
    state: { events: [] }, elEventsLog: log, elEventsLogSummary: null,
    lastLogRenderedKey: null, eventTableContexts: {}, SKILLS: [{ id: "attack", label: "Attacco" }],
    getEventKey: ev => String(ev.eventId),
    getTeamScopeFromEvent: () => "our", getPlayerNumbersForScope: () => ({}),
    formatNameWithNumberFor: name => name,
    getVideoSkillEvents: () => [], getVideoBaseTimeMs: () => null,
    publishMatchNotes() {},
    updateTeamCounters() {}, publishRuntimeView() {}, publishReactLogServeTrajectories() {}, publishDvwEntryView() {}, updateLiveDvwMirror() {},
    getSkillLabel: () => "Attacco", getEventDisplayCode: ev => ev.code, eventLogSummaryStore: { publish() {} },
    requestAnimationFrame: callback => frames.push(callback),
    publishReactEventTable(id, events, options) {
      const target = log;
      if (!options.append) target.innerHTML = "<table><tbody></tbody></table>";
      const tbody = target.querySelector("tbody");
      for (const event of events) {
        const row = dom.window.document.createElement("tr");
        row.dataset.eventId = String(event.eventId);
        tbody.appendChild(row);
      }
    }
  };
  vm.createContext(c);
  vm.runInContext(source, c);
  const add = eventId => c.state.events.push({ eventId, set: 1, skillId: "attack", code: "+", playerName: "Giocatrice" });
  const flush = () => { while (frames.length) frames.shift()(); };
  try {
    add(1);
    c.renderEventsLog();
    assert.equal(scrolledRows.length, 0, "attende il layout");
    flush();
    add(2);
    c.renderEventsLog({ append: true });
    flush();
    assert.equal(log.querySelectorAll("tbody tr").length, 2);
    assert.equal(log.scrollTop, 100);
    assert.equal(scrolledRows.length, 0, "non scorre la pagina per mostrare la riga");
    c.renderEventsLog({ suppressScroll: true });
    flush();
    assert.equal(log.scrollTop, 100, "le modifiche senza scorrimento mantengono la posizione");
    add(3);
    c.renderEventsLog();
    flush();
    assert.equal(scrolledRows.length, 0);
    assert.equal(log.scrollTop, 150);
  } finally {
    dom.window.close();
  }
});

test("la selezione nello scout scorre solo il registro, mai la pagina", () => {
  let pageScrolls = 0;
  const log = { scrollTop: 20, getBoundingClientRect: () => ({ top: 100, bottom: 200 }) };
  const row = { closest: () => log, getBoundingClientRect: () => ({ top: 205, bottom: 225 }), scrollIntoView: () => pageScrolls++ };
  const c = { document: { body: { dataset: { activeTab: "scout" } } } };
  vm.runInNewContext(sourceFunctions(readSourceFixture("src/features/events/selection-commands.js", "utf8"), ["scrollRowIntoView"]), c);
  c.scrollRowIntoView({ tr: row });
  assert.equal(log.scrollTop, 45);
  row.closest = () => null;
  c.scrollRowIntoView({ tr: row });
  assert.equal(pageScrolls, 0);
});
