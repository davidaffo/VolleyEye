import assert from 'node:assert/strict';
import test from 'node:test';
import { session as match } from '../js/globals.js';
import { attackShortcutStore } from '../src/state/attack-shortcut-store.mjs';
import { publishAttackSetterOptions } from '../src/features/scout/attack-shortcut-view.js';

for (const scope of ['our', 'opponent']) {
  test(`la scelta dell'alzatore in video include la rosa non più in campo (${scope})`, () => {
    const oldState = match.state;
    const oldDocument = globalThis.document;
    try {
      const court = [{ main: 'Palleggiatrice', replaced: '' }, { main: 'Libero', replaced: 'Centrale' },
        ...Array.from({ length: 4 }, () => ({ main: '', replaced: '' }))];
      match.state = {
        players: ['Palleggiatrice', 'Centrale', 'Riserva', 'Libero'],
        opponentPlayers: ['Palleggiatrice', 'Centrale', 'Riserva', 'Libero'],
        court, opponentCourt: court, rotation: 1, opponentRotation: 1,
        liberos: ['Libero'], opponentLiberos: ['Libero'],
      };
      globalThis.document = { body: { dataset: { activeTab: 'video' } } };
      publishAttackSetterOptions(scope, 2);
      let options = attackShortcutStore.getSnapshot().setters;
      assert.deepEqual(options.map(option => option.index), [null, 0, 1, 2, 3]);
      assert.match(options[3].className, /active/);
      globalThis.document.body.dataset.activeTab = 'scout';
      publishAttackSetterOptions(scope, null);
      options = attackShortcutStore.getSnapshot().setters;
      assert.deepEqual(options.map(option => option.index), [null, 0, 1, 3]);
    } finally {
      match.state = oldState;
      globalThis.document = oldDocument;
    }
  });
}
