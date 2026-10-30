import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { session as match } from '../js/globals.js';
import { analysisTableStore } from '../src/state/analysis-table-store.mjs';
import { publishReactAttackSummary } from '../src/features/analysis/trajectory-view.js';

const cases = JSON.parse(readFileSync(new URL('./fixtures/attack-summary-reference.json', import.meta.url), 'utf8'));
for (const scenario of cases) test(`native attack summary retains prior rows, totals and comparisons: ${scenario.name}`, () => {
  const previousState = match.state, previousViews = analysisTableStore.getSnapshot();
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  try {
    Object.defineProperty(globalThis, 'document', { configurable: true, get() { throw new Error('Summary publication must not read the DOM'); } });
    match.state = structuredClone(scenario.state);
    const untouched = { rows: [] };
    analysisTableStore.replace({ untouched });
    const events = structuredClone(scenario.events), comparison = structuredClone(scenario.compare);
    publishReactAttackSummary('summary', events, comparison);
    assert.deepEqual(analysisTableStore.getView('summary'), scenario.expected);
    assert.equal(analysisTableStore.getView('untouched'), untouched);
    assert.deepEqual(events, scenario.events);
    assert.deepEqual(comparison, scenario.compare);
  } finally {
    match.state = previousState;
    analysisTableStore.replace(previousViews);
    delete globalThis.document;
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
  }
});
