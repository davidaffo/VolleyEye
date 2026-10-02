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
    getScoreOverrideTotals: () => ({ for: 0, against: 0 }),
    normalizeScoreOverrides: value => value || {}
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

for (const [name, count, date] of [['Castenaso - Budrio.dvw', 144, '2026-09-23'], ['Finale Villanova-Budrio.dvw', 174, '2026-10-01']]) {
  test(`VolleyScout: attacchi e coordinate originali di ${name}`, () => {
    const ctx = harness();
    const text = readFileSync(`resources/data volley da volleyscout/${name}`, 'utf8');
    const result = ctx.parseDataVolleyDvwToMatchState(text);
    const rows = ctx.parseDvwSections(text).get('3SCOUT').map(ctx.parseDvwRow).filter(row => /^a\d{2}A/.test(row[0]));
    const attacks = result.events.filter(event => event.skillId === 'attack');
    assert.equal(attacks.length, count);
    assert.equal(result.match.date, date);
    attacks.forEach((event, i) => {
      const row = rows[i];
      const zones = row[0].match(/~~~(\d)(\d)/);
      assert.equal(event.attackStartZone, Number(zones[1]));
      assert.equal(event.attackEndZone, Number(zones[2]));
      assert.equal(event.dvwCoordinates.start, Number(row[4]));
      assert.equal(event.dvwCoordinates.end, Number(row[6]));
      assert.equal(event.dv.skillType, '');
      assert.ok(event.attackDirection?.start && event.attackDirection?.end);
      assert.deepEqual(event.attackTrajectory, event.attackDirection);
      for (const point of [event.attackStart, event.attackEnd]) {
        assert.ok(point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1);
      }
    });
    // Different landings in the same zone must not collapse to its centre.
    const sameZone = attacks.filter(event => event.attackEndZone === 6);
    assert.ok(new Set(sameZone.map(event => JSON.stringify(event.attackEnd))).size > 1);
    ctx.state = result;
    const finalRows = ctx.parseDvwSections(text).get('3SET').map(ctx.parseDvwRow);
    finalRows.forEach((row, index) => {
      const score = String(row[4] || '').match(/(\d+)\s*-\s*(\d+)/);
      if (!score) return;
      const home = ctx.computePointsSummary(index + 1, { events: result.events, teamScope: 'our' });
      const away = ctx.computePointsSummary(index + 1, { events: result.events, teamScope: 'opponent' });
      assert.deepEqual([home.totalFor, home.totalAgainst], [Number(score[1]), Number(score[2])]);
      assert.deepEqual([away.totalFor, away.totalAgainst], [Number(score[2]), Number(score[1])]);
    });
  });
}

test('coordinate DVW: indici mancanti, orientamento e fallback alle zone', () => {
  const ctx = harness();
  for (const invalid of ['', '-1-1', '-1', '0', '10101', 'abcd']) assert.equal(ctx.parseDvwCoordinateIndex(invalid), null);
  const first = ctx.buildDvwAttackCoordinatePoints('4517', '7775');
  // Column 17 originates on the left, column 75 lands on the right.
  assert.ok(first.start.x < 0.2);
  assert.ok(first.end.x > 0.7 && first.end.y < 0.5);
  const flipped = ctx.buildDvwAttackCoordinatePoints('5684', '2856');
  assert.ok(flipped.start.x < 0.2);
  assert.equal(ctx.buildDvwAttackCoordinatePoints('4517', '-1-1'), null);
  assert.equal(ctx.parseDvwSkillCode('a17A~#~~~36~H').zoneMeta.startZone, '3');
  assert.equal(ctx.parseDvwSkillCode('a17A~#~~~36~H').zoneMeta.endZone, '6');
});
