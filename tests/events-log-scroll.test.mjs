import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { readScoutSource } from "./helpers/scout-source.mjs";

const scout = readScoutSource();
const source = scout.slice(scout.indexOf("function renderEventsLog("), scout.indexOf("function getTimeoutCountForSet("));

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
    updateTeamCounters() {}, renderLogServeTrajectories() {}, updateLiveDvwMirror() {},
    requestAnimationFrame: callback => frames.push(callback),
    renderEventTableRows(target, events, options) {
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
    assert.equal(scrolledRows.at(-1).id, "2");
    assert.equal(scrolledRows.at(-1).options.block, "nearest");
    assert.equal(scrolledRows.at(-1).options.inline, "nearest");
    c.renderEventsLog({ suppressScroll: true });
    flush();
    assert.equal(scrolledRows.length, 2, "le modifiche senza scorrimento mantengono la posizione");
    add(3);
    c.renderEventsLog();
    flush();
    assert.equal(scrolledRows.at(-1).id, "3");
    assert.equal(log.scrollTop, 150);
  } finally {
    dom.window.close();
  }
});
