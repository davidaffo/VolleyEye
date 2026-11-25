import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { session as match } from '../js/globals.js';
import { analysisTableStore } from '../src/state/analysis-table-store.mjs';
import { publishReactAttackSummary } from '../src/features/analysis/trajectory-view.js';
import { SKILL_COLUMNS } from '../src/domain/analysis-columns.js';
import { buildSkillEntries } from '../src/features/analysis/statistic-model.js';
import { countEvaluatedEvents } from '../src/features/analysis/count-table-model.js';

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
    const view = analysisTableStore.getView('summary');
    assert.deepEqual(view.rows.map(row => row.cells[0].text), scenario.expected.rows.map(row => row.cells[0].text));
    assert.equal(view.emptyText, scenario.expected.emptyText);
    for (const row of [...view.rows, ...view.footerRows]) {
      assert.equal(row.cells.length, 1 + SKILL_COLUMNS.find(skill => skill.id === 'attack').columns.length);
    }
    if (view.footerRows.length) {
      const counts = countEvaluatedEvents(events.filter(event => event?.skillId === 'attack'));
      const entries = buildSkillEntries('attack', counts);
      assert.deepEqual(view.footerRows[0].cells.slice(1).map(cell => cell.raw), entries.map(entry => entry.value));
    }
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

test('attack summary groups filtered attacks by normalized set type, including missing types', () => {
  const previousViews = analysisTableStore.getSnapshot();
  try {
    publishReactAttackSummary('sets', [
      { skillId: 'attack', setType: 'Mezza', code: '#' },
      { skillId: 'attack', combination: { set_type: 'mezza' }, code: '=' },
      { skillId: 'attack', code: '/' },
      { skillId: 'serve', setType: 'super', code: '#' },
    ], null, { groupBy: 'setType' });
    const view = analysisTableStore.getView('sets');
    assert.deepEqual(view.rows.map(row => row.cells.slice(0, 6).map(cell => cell.text)), [
      ['Mezza', 2, 1, '50%', 0, 1],
      ['Non specificata', 1, 0, '0%', 1, 0],
    ]);
    assert.equal(view.footerRows[0].cells[1].text, 3);
  } finally {
    analysisTableStore.replace(previousViews);
  }
});
