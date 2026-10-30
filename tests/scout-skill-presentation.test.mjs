import test from 'node:test';
import assert from 'node:assert/strict';
import { session as match } from '../js/globals.js';
import { buildPreparedScoutSkillView } from '../src/features/scout/skill-control-model.js';

const player = { playerIdx: 2, activeName: 'Ada', scope: 'opponent' };
const freeze = value => {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

for (const inModal of [false, true]) test(`prepared controls are repeatable without reading match state: ${inModal ? 'modal' : 'court'}`, () => {
  const previous = match.state;
  match.state = new Proxy({}, { get: (_, key) => { throw new Error('Presentation read state.' + String(key)); } });
  try {
    for (const details of [
      { kind: 'empty' }, { kind: 'note', text: 'Attesa' }, { kind: 'serve-error' },
      { kind: 'block-confirm', mobile: false }, { kind: 'block-confirm', mobile: true },
      { kind: 'picker', picked: 'pass' }, { kind: 'picker', picked: null },
      { kind: 'skills', skills: [{ id: 'attack', label: 'Attacco' }] },
      { kind: 'serve-types' },
      { kind: 'attack-types', options: [{ value: 'High', label: 'Alta' }, { value: 'Fast', label: 'Attacco', queued: true, main: true }] },
      { kind: 'codes', picked: 'attack', codes: [{ code: '+', tone: 'positive' }, { code: '=', tone: 'negative' }], showBack: true, next: true },
    ]) {
      const input = freeze({ player: { ...player, inModal }, hasSelection: true, ...details });
      const clone = structuredClone(input);
      const first = buildPreparedScoutSkillView(input);
      const second = buildPreparedScoutSkillView(input);
      assert.deepEqual(first, second);
      assert.deepEqual(structuredClone(first), first);
      assert.deepEqual(input, clone);
      for (const group of first.groups) if (inModal) {
        assert.equal(group.className, 'modal-skill-codes');
        assert.equal(group.header, null);
      }
    }
  } finally { match.state = previous; }
});

test('shared evaluations preserve raw recording name, display name and restricted serve command', () => {
  const view = buildPreparedScoutSkillView({ player: { ...player, activeName: null, inModal: true }, hasSelection: false,
    kind: 'codes', picked: 'pass', playerName: 'Display name', codes: [{ code: '+', tone: 'positive' }] });
  const button = view.groups[0].buttons[0];
  assert.equal(button.data.playerName, 'Display name');
  assert.equal(button.action.args[0].activeName, null);
  assert.deepEqual(button.action.args.slice(1), ['pass', '+', false]);
  const restricted = buildPreparedScoutSkillView({ player, hasSelection: true, kind: 'serve-error' }).groups[0].buttons[0];
  assert.deepEqual(restricted.action.args.slice(1), ['serve', '=', true]);
  assert.equal(restricted.className, 'event-btn code-negative');
});
