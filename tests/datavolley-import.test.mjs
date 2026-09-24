import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';

function harness() {
  const context = {
    state: { useOpponentTeam: true }, DEFAULT_STAFF: {},
    ensureCourtShapeFor: court => court,
    normalizeDataVolleyEventMeta: value => ({ ...value }),
    getTeamScopeFromEvent: event => event.team === 'opponent' ? 'opponent' : 'our',
    computeAttackDirectionDeg: () => 0,
    getScoreOverrideTotals: () => ({ for: 0, against: 0 })
  };
  for (const file of ['datavolley-export', 'datavolley-codec', 'datavolley-match-import']) {
    vm.runInNewContext(readFileSync(`js/scout/io/${file}.js`, 'utf8'), context);
  }
  context.computeDataVolleyEventSignature = () => '';
  vm.runInNewContext(readFileSync('js/scout/live/score-analysis.js', 'utf8'), context);
  context.ensurePointRulesDefaults = () => {};
  context.normalizePointRule = () => ({ for: ['#'], against: ['='] });
  return context;
}
const root = 'resources/data volley';
const files = [`${root}/data volley example file.dvw`, ...readdirSync(`${root}/files scout`).filter(f => f.endsWith('.dvw')).map(f => `${root}/files scout/${f}`)];
for (const file of files) {
  test(`DataVolley originale: ${file}`, () => {
    const ctx = harness();
    const text = readFileSync(file, 'utf8');
    const result = ctx.parseDataVolleyDvwToMatchState(text);
    const sections = ctx.parseDvwSections(text);
    const finals = sections.get('3SET').map(line => ctx.parseDvwRow(line)[4]).filter(score => /\d+\s*-\s*\d+/.test(score || ''));
    assert.equal(result.currentSet, finals.length);
    assert.equal(Object.keys(result.setStarts).length, finals.length);
    for (let i = 0; i < finals.length; i++) {
      const expected = finals[i].split('-').map(Number);
      const summary = ctx.computePointsSummary(i + 1, { events: result.events, includeOverrides: false });
      assert.deepEqual([summary.totalFor, summary.totalAgainst], expected);
      const first = sections.get('3SCOUT').map(ctx.parseDvwRow).find(cells => Number(cells[8]) === i + 1 && ctx.parseDvwSkillCode(cells[0]).kind === 'skill');
      for (const [scope, offset, numbers] of [['our', 14, result.playerNumbers], ['opponent', 20, result.opponentPlayerNumbers]]) {
        const start = result.setStarts[i + 1][scope];
        assert.deepEqual(Array.from(start.court, slot => Number(numbers[slot.main])), Array.from(first.slice(offset, offset + 6), Number));
        assert.equal(start.rotation, Number(first[scope === 'our' ? 9 : 10]));
      }
    }
    const running = new Map();
    for (const event of result.events) {
      const score = running.get(event.set) || [0, 0];
      const direction = ctx.getPointDirectionForScope(event, 'our');
      if (direction) score[direction === 'for' ? 0 : 1] += event.value;
      running.set(event.set, score);
      assert.deepEqual([event.homeScore, event.visitorScore], score, `progressione errata: ${event.eventId}`);
      assert.ok(event.set >= 1 && event.set <= finals.length);
      assert.equal(event.value, 1, `salto di punti: ${event.eventId}`);
    }
  });
}

test('compatibilità con i vecchi export VolleyEye con una colonna aggiuntiva', () => {
  const ctx = harness();
  const original = readFileSync(files[1], 'utf8');
  const [header, scout] = original.split('[3SCOUT]');
  const legacy = header.replace('GENERATOR-PRG: Data Volley', 'GENERATOR-PRG: VolleyEye') + '[3SCOUT]' + scout.split('\n').map(line => {
    if (!line.trim()) return line;
    const cells = line.split(';');
    cells.splice(1, 0, '');
    return cells.join(';');
  }).join('\n');
  assert.equal(JSON.stringify(ctx.parseDataVolleyDvwToMatchState(legacy)), JSON.stringify(ctx.parseDataVolleyDvwToMatchState(original)));
});

test('export DVW usa le colonne standard per orario, set e formazioni', () => {
  const ctx = harness();
  const row = ctx.buildDvRow('*01SH#', { time: '12.34.56', setNum: 3, ourCourt: Array.from({length: 6}, () => ({main: ''})), opponentCourt: Array.from({length: 6}, () => ({main: ''})) }).split(';');
  assert.equal(row[7], '12.34.56');
  assert.equal(row[8], '3');
  assert.equal(row.length, 27);
});
