import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readRuntimeSource } from './helpers/react-runtime.mjs';

test('React player regions follow comparison and preferences without replacing mounted panels', () => {
  const dom = new JSDOM('<div id="root"></div>', { runScripts: 'outside-only', url: 'https://volleyeye.test/' });
  const window = dom.window;
  try {
    window.eval(readRuntimeSource('react-views'));
    const store = window.__reactViews.playerAnalysisStore;
    const query = selector => window.document.querySelector(selector);
    const hidden = selector => query(selector).classList.contains('hidden');
    const table = query('#player-analysis-table-wrap');
    const panel = query('#player-analysis-attack');
    store.publish({ entries: [{ idx: 0 }, { idx: 1 }], primary: null, compare: null,
      preferences: { compareEnabled: true, showAttack: false, showServe: true, showSecond: false } });
    window.__flushReactViews();
    assert.equal(hidden('#player-analysis-compare-filter'), false);
    assert.equal(hidden('#player-analysis-attack'), true);
    assert.equal(hidden('#player-analysis-serve'), false);
    assert.equal(hidden('#player-analysis-second'), true);
    assert.equal(hidden('#player-analysis-table-wrap'), false);
    store.publish({ compare: { playerIdx: 1, metrics: [] } });
    window.__flushReactViews();
    assert.equal(hidden('#player-analysis-table-wrap'), true);
    assert.equal(hidden('.player-analysis-columns'), true);
    assert.equal(hidden('.player-skill-charts-panel'), true);
    store.publish({ compare: null, entries: [{ idx: 0 }], preferences: { compareEnabled: true, showAttack: true } });
    window.__flushReactViews();
    assert.equal(hidden('#player-analysis-compare-filter'), true);
    assert.equal(hidden('#player-analysis-attack'), false);
    assert.equal(hidden('.player-analysis-columns'), false);
    assert.equal(query('#player-analysis-table-wrap'), table);
    assert.equal(query('#player-analysis-attack'), panel);
  } finally {
    window.__unmountReactViews?.();
    dom.window.close();
  }
});
