import assert from 'node:assert/strict';
import test from 'node:test';
import { createMatchDialogStore } from '../src/state/match-dialog-store.mjs';
function setup(details = {}, mode = 'create') {
  const store = createMatchDialogStore();
  store.open({mode,details,teamNames:['Casa','Ospiti'],today:'2026-09-09',currentCategory:'U18'});
  return store;
}
test('il dialogo mantiene separati avversario manuale e squadra selezionata', () => {
  const store=setup();
  store.update('opponentManual','Manuale');
  assert.equal(store.getSnapshot().draft.teamName,'Casa');
  assert.equal(store.getSnapshot().draft.opponentManual,'Manuale');
  assert.equal(store.getSnapshot().draft.date,'2026-09-09');
});
test('la modalità doppia squadra conserva la selezione indipendente', () => {
  const store=setup({useOpponentTeam:true,selectedTeam:'Casa',selectedOpponentTeam:'Ospiti'});
  assert.equal(store.getSnapshot().draft.mode,'double');
  assert.equal(store.getSnapshot().draft.opponentTeam,'Ospiti');
  store.update('teamName','Ospiti');
  assert.equal(store.getSnapshot().draft.opponentTeam,'Casa');
});
test('modificare i dati partita conserva le identità delle squadre', () => {
  const store=setup({useOpponentTeam:true,selectedTeam:'Casa',selectedOpponentTeam:'Ospiti',match:{category:'U16'}},'edit');
  store.update('teamName','Ospiti');
  store.update('mode','single');
  store.update('opponentTeam','Casa');
  assert.equal(store.getSnapshot().draft.teamName,'Casa');
  assert.equal(store.getSnapshot().draft.mode,'double');
  assert.equal(store.getSnapshot().draft.opponentTeam,'Ospiti');
});
test('la bozza non modifica il match e annullarla conserva i dati salvati', () => {
  const details={match:{category:'U16',date:'2026-01-02'}};
  const store=setup(details,'edit');
  store.update('category','U18');
  store.close();
  assert.equal(store.getSnapshot().open,false);
  assert.equal(details.match.category,'U16');
  store.open({mode:'edit',details,teamNames:['Casa','Ospiti'],today:'2026-09-09'});
  assert.equal(store.getSnapshot().draft.category,'U16');
});
