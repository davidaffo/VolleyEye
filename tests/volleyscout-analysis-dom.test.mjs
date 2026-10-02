import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { IDBFactory } from 'fake-indexeddb';
import { runtimeFiles } from './helpers/browser-runtime-files.mjs';

async function browser(options = {}) {
  const html = readFileSync('index.html', 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const dom = new JSDOM(html, { url: 'https://volleyeye.test/', runScripts: 'outside-only' });
  const { window } = dom;
  await new Promise(resolve => window.document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  const strokes = new Map();
  window.HTMLCanvasElement.prototype.getContext = function () {
    const canvas = this;
    return new Proxy({ measureText: text => ({ width: String(text).length * 8 }) }, {
      get(target, key) {
        if (key in target) return target[key];
        return (...args) => {
          if (key === 'stroke') strokes.set(canvas, (strokes.get(canvas) || 0) + 1);
        };
      }
    });
  };
  // Decode/layout are provided by browsers. The tests exercise real DOM rendering
  // and record canvas draw calls without fetching external image assets.
  Object.defineProperties(window.HTMLImageElement.prototype, {
    complete: { get: () => true }, naturalWidth: { get: () => 1080 }, naturalHeight: { get: () => 1080 }
  });
  window.indexedDB = options.indexedDB || new IDBFactory();
  window.structuredClone = structuredClone;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
  window.setTimeout = () => 0;
  window.clearTimeout = () => {};
  window.setInterval = () => 0;
  window.clearInterval = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLMediaElement.prototype.pause = () => {};
  window.alert = message => assert.fail(message);
  window.localStorage.setItem('volleyeye-default-demo-preference', 'removed');
  const context = dom.getInternalVMContext();
  runtimeFiles.forEach(file => vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file }));
  await window.init();
  return { dom, window, context, strokes };
}
for (const [file, count] of [['Castenaso - Budrio.dvw', 144], ['Finale Villanova-Budrio.dvw', 174]]) {
  test(`DOM analisi VolleyScout: ${file}`, async () => {
    const { dom, window, context, strokes } = await browser();
    try {
      window.importText = readFileSync(`resources/data volley da volleyscout/${file}`, 'utf8');
      await vm.runInContext(`(async () => {
        const parsed = parseDataVolleyDvwToMatchState(importText);
        // Simulate a match stored before score reconciliation was introduced.
        parsed.scoreOverrides = {};
        const archived = await importMatchStateAsNew(parsed, { silent: true });
        elSavedMatchesSelect.value = archived.name;
        if (!enterSelectedMatch()) throw new Error("Ingresso nella partita fallito");
        setActiveTab("aggregated");
        setActiveAggTab("summary");
        renderAggregatedTable();
        renderMatchSheetAnalysis();
        renderTrajectoryAnalysis();
        await archiveStorage.flush();
      })()`, context);
      assert.equal(window.getAnalysisTeamScope(), 'opponent');
      assert.equal(window.document.body.dataset.activeTab, 'aggregated');
      assert.match(window.document.getElementById('agg-table-body').textContent, /Lazzari/);
      assert.equal(Number(window.document.querySelector('#agg-table-body .total .skill-attack').textContent), count);
      assert.match(window.document.getElementById('match-sheet-page').textContent, /Lazzari/);
      assert.ok(window.document.querySelectorAll('#match-sheet-page svg line').length > 0);
      assert.equal(window.getFilteredTrajectoryEvents().length, count);
      const finalScores = vm.runInContext("computeSetScores('opponent').sets", context);
      const expectedScores = vm.runInContext(`parseDvwSections(importText).get('3SET')
        .map(parseDvwRow).map(row => String(row[4] || '').match(/(\\d+)\\s*-\\s*(\\d+)/))
        .filter(Boolean).map(score => ({ for: Number(score[2]), against: Number(score[1]) }))`, context);
      assert.deepEqual(
        JSON.parse(JSON.stringify(finalScores.map(({ for: made, against }) => ({ for: made, against })))),
        JSON.parse(JSON.stringify(expectedScores))
      );
      assert.ok([...strokes].some(([canvas, n]) => canvas.hasAttribute('data-traj-canvas') && n > 0));
      assert.equal(window.document.querySelector('#analysis-filter-teams input[value="opponent"]').checked, true);
      // The first load used the previous single-team app default. A saved-session
      // restore must keep selecting Budrio without inventing a home roster.
      vm.runInContext('analysisTeamFilterState.teams = new Set(["our"]);', context);
      assert.equal(await window.loadStateFromIndexedDb(), true);
      assert.equal(window.getAnalysisTeamScope(), 'opponent');
      assert.equal(vm.runInContext('state.players.length', context), 0);
      assert.equal(window.getFilteredTrajectoryEvents().length, count);
      await vm.runInContext('archiveStorage.flush()', context);
      if (file === 'Castenaso - Budrio.dvw') {
        const restarted = await browser({ indexedDB: window.indexedDB });
        try {
          assert.equal(restarted.window.getAnalysisTeamScope(), 'opponent');
          assert.equal(vm.runInContext('state.players.length', restarted.context), 0);
          assert.equal(restarted.window.getFilteredTrajectoryEvents().length, count);
          restarted.window.renderAggregatedTable();
          assert.equal(Number(restarted.window.document.querySelector('#agg-table-body .total .skill-attack').textContent), count);
          await vm.runInContext('archiveStorage.flush()', restarted.context);
        } finally {
          restarted.dom.window.close();
        }
      }
    } finally {
      dom.window.close();
    }
  });
}
