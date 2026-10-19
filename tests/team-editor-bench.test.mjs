import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JSDOM } from "jsdom";

const source = readFileSync(new URL("../js/roster/editor/team-editor.js", import.meta.url), "utf8");

test("compilare una nuova giocatrice aggiorna le riserve senza ricreare gli input", () => {
  const dom = new JSDOM('<table><tbody id="players"></tbody></table><div id="court"></div><div id="bench"></div>', {
    runScripts: "outside-only"
  });
  const w = dom.window;
  Object.assign(w, {
    elTeamManagerBody: w.document.getElementById("players"),
    elTeamManagerTemplate: null,
    elDefaultLineupGrid: w.document.getElementById("court"),
    elDefaultLineupBench: w.document.getElementById("bench"),
    elDefaultLineupRotation: null,
    elDefaultLineupPreferredLibero: null,
    teamManagerLiveEditMode: false,
    teamManagerScope: "our",
    teamManagerState: {
      players: [{ id: "player-1", name: "", firstName: "", lastName: "", role: "", number: "8" }],
      defaultLineup: []
    },
    isValidPlayerId: () => true,
    buildFullName: (last, first) => [last, first].filter(Boolean).join(" "),
    formatStructuredPlayerName: name => name,
    findPlayersDbMatchByName: () => null
  });
  w.eval(source);
  try {
    w.renderTeamManagerTable();
    assert.equal(w.elDefaultLineupBench.querySelector(".default-lineup-chip"), null);
    const last = w.elTeamManagerBody.querySelector('input[placeholder="Cognome"]');
    const first = w.elTeamManagerBody.querySelector('input[placeholder="Nome"]');
    last.value = "Rossi";
    last.dispatchEvent(new w.Event("input"));
    first.value = "Anna";
    first.dispatchEvent(new w.Event("input"));
    const chip = w.elDefaultLineupBench.querySelector(".default-lineup-chip");
    assert.equal(chip.dataset.playerName, "Rossi Anna");
    assert.equal(chip.textContent, "8 - Rossi Anna");
    assert.equal(w.elTeamManagerBody.querySelector('input[placeholder="Nome"]'), first);

    chip.click();
    assert.equal(w.teamManagerState.defaultLineup[0], "Rossi Anna");
    last.value = "Verdi";
    last.dispatchEvent(new w.Event("input"));
    assert.equal(w.teamManagerState.defaultLineup[0], "Verdi Anna");
    assert.equal(w.elDefaultLineupGrid.querySelector('[data-slot-index="0"] .default-lineup-name').textContent, "8 - Verdi Anna");
    assert.equal(w.elDefaultLineupBench.querySelector(".default-lineup-chip"), null);
  } finally {
    w.close();
  }
});
