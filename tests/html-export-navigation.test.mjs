import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { IDBFactory } from "fake-indexeddb";
import { runtimeFiles } from "./helpers/browser-runtime-files.mjs";

async function browser(html) {
  const dom = new JSDOM(html, { url: "https://volleyeye.test/", runScripts: "outside-only" });
  const w = dom.window;
  await new Promise(resolve => w.document.addEventListener("DOMContentLoaded", resolve, { once: true }));
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({ measureText: text => ({ width: String(text).length * 8 }) }, { get: (object, key) => object[key] || (() => {}) });
  Object.defineProperties(w.HTMLImageElement.prototype, {
    complete: { get: () => true }, naturalWidth: { get: () => 1080 }, naturalHeight: { get: () => 1080 }
  });
  w.indexedDB = new IDBFactory();
  w.structuredClone = structuredClone;
  w.Blob = Blob;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.requestAnimationFrame = () => 0;
  w.cancelAnimationFrame = () => {};
  w.setTimeout = () => 0;
  w.setInterval = () => 0;
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLMediaElement.prototype.pause = () => {};
  w.alert = message => assert.fail(message);
  w.localStorage.setItem("volleyeye-default-demo-preference", "removed");
  return { dom, w, c: dom.getInternalVMContext() };
}

test("l'HTML esportato contiene soltanto Analisi e permette di navigare tra tutte le sue sottoschermate", async () => {
  const original = readFileSync("index.html", "utf8").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const app = await browser(original);
  let exported;
  try {
    for (const path of runtimeFiles) {
      vm.runInContext(readFileSync(path, "utf8"), app.c, { filename: path });
      const script = app.w.document.createElement("script");
      script.src = path;
      app.w.document.body.appendChild(script);
    }
    await app.w.init();
    vm.runInContext(`state.selectedMatch = state.loadedMatchName = "Partita test"; state.savedMatches["Partita test"] = getCurrentMatchPayload("Partita test"); state.uiMatchSessionActive = true; setActiveTab("aggregated");`, app.c);
    const scriptFixtures = {
      "js/export-boundary-first.js": 'window.__boundaryMarker = (() => true)()',
      "js/export-boundary-second.js": '(function(){ window.__boundaryNext = true; })()'
    };
    for (const src of [...Object.keys(scriptFixtures), 'https://www.googletagmanager.com/gtag/js?id=test']) {
      const script = app.w.document.createElement('script');
      script.src = src;
      app.w.document.body.appendChild(script);
    }
    app.w.fetch = async url => {
      const parsed = new URL(url);
      assert.equal(parsed.origin, 'https://volleyeye.test', 'gli script esterni non fanno parte del report');
      const path = parsed.pathname.slice(1);
      return { ok: true, text: async () => scriptFixtures[path] || readFileSync(path, "utf8") };
    };
    app.w.collectInlineCss = async () => readFileSync("style.css", "utf8");
    const embeddedAssets = Object.fromEntries(app.w.getExportAssetPaths().map(path => [path, 'data:image/png;base64,' + readFileSync(path).toString('base64')]));
    app.w.buildExportAssetMap = async () => embeddedAssets;
    app.w.downloadBlob = blob => { exported = blob; };
    await app.w.exportAnalysisHtml();
    assert.ok(exported);
    const report = await browser(await exported.text());
    try {
      const scripts = [...report.w.document.querySelectorAll("script")];
      assert.equal(scripts.length, 1);
      vm.runInContext(scripts[0].textContent, report.c, { filename: "exported-report.js" });
      assert.ok(report.w.__exportedAnalysisReady);
      await report.w.__exportedAnalysisReady;
      assert.equal(report.w.__boundaryMarker, true);
      assert.equal(report.w.__boundaryNext, true);
      assert.equal(Object.keys(report.w.__analysisAssetMap).length, Object.keys(embeddedAssets).length);
      for (const [path, dataUrl] of Object.entries(embeddedAssets)) {
        assert.equal(report.w.__analysisAssetMap[path], dataUrl, `immagine incorporata: ${path}`);
      }
      for (const far of [false, true]) {
        for (const zone of [2, 3, 4]) {
          const path = `images/trajectory/attack_${zone}_${far ? 'far' : 'near'}.png`;
          assert.equal(report.w.getTrajectoryImageForZone(zone, far), embeddedAssets[path]);
          assert.equal(report.w.getTrajectoryBg(zone, far).src, embeddedAssets[path]);
        }
        assert.equal(report.w.getAttackEmptyImage(far).src, embeddedAssets[`images/trajectory/attack_empty_${far ? 'far' : 'near'}.png`]);
      }
      assert.equal(report.w.document.querySelectorAll('.tab-panel').length, 1);
      assert.equal(report.w.document.querySelector('.tab-panel').dataset.tab, 'aggregated');
      assert.equal(report.w.document.querySelector('.tabs-nav, .tabs-dots'), null);
      for (const target of ["trajectory", "serve", "second", "player", "set-trend", "play-by-play", "skill-charts", "match-sheet", "summary"]) {
        const button = report.w.document.querySelector(`[data-agg-tab-target="${target}"]`);
        assert.ok(button, target);
        button.click();
        assert.equal(report.w.document.body.dataset.aggTab, target);
        assert.ok(report.w.document.querySelector(`.agg-subpanel.active[data-agg-tab="${target}"]`));
      }
    } finally {
      report.dom.window.close();
    }
  } finally {
    app.dom.window.close();
  }
});
