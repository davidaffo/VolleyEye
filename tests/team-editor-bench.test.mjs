import assert from 'node:assert/strict';
import test from 'node:test';
import { session as editor } from '../src/features/state/roster-lineup.js';
import { changeTeamEditorPlayerName, publishTeamEditorView } from '../src/features/teams/editor-view.js';
import { teamEditorStore } from '../src/state/team-editor-store.mjs';

test('compilare e rinominare una giocatrice aggiorna riserve, formazione e libero preferito', () => {
  const previous = editor.teamManagerState;
  const snapshot = teamEditorStore.getSnapshot();
  try {
    const player = { id: '11111111-1111-4111-8111-111111111111', name: '', firstName: '', lastName: '', number: '8' };
    editor.teamManagerState = { players: [player], defaultLineup: [] };
    publishTeamEditorView();
    assert.equal(teamEditorStore.getSnapshot().bench.length, 0);
    changeTeamEditorPlayerName(player, '', 'Rossi', { matchDatabase: false });
    changeTeamEditorPlayerName(player, 'Anna', 'Rossi', { matchDatabase: false });
    assert.equal(teamEditorStore.getSnapshot().bench[0].name, 'Rossi Anna');
    editor.teamManagerState.defaultLineup = ['Rossi Anna'];
    changeTeamEditorPlayerName(player, 'Anna', 'Verdi', { matchDatabase: false });
    assert.equal(editor.teamManagerState.defaultLineup[0], 'Verdi Anna');
    player.role = 'L';
    editor.teamManagerState.preferredLibero = 'Verdi Anna';
    changeTeamEditorPlayerName(player, 'Anna', 'Neri', { matchDatabase: false });
    assert.equal(editor.teamManagerState.preferredLibero, 'Neri Anna');
    assert.equal(teamEditorStore.getSnapshot().bench.length, 0);
  } finally {
    editor.teamManagerState = previous;
    teamEditorStore.replace(snapshot);
  }
});
