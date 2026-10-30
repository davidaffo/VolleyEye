import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { TEMPLATE_TEAM, PLAYER_PHOTO_REMOVE_RESULT } from '../js/globals.js';
import { buildPlayersDbUsage, buildPlayersDbView } from '../src/features/players/database-model.js';
import { readSourceFixture } from './helpers/source-fixture.mjs';

const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
const team = (id, out = false) => ({ version: 3, playersDetailed: [{ id, lastName: 'Ada', firstName: 'A', out }] });

test('player database model preserves sorting, label fallback, template exclusion and orphan counts', () => {
  const db = { z: { id: ids[2], lastName: 'Zulu', firstName: 'Zoe', name: 'Existing label', photo: 'data:image/png;base64,AAA' },
    a: { id: ids[0], lastName: 'Alfa', firstName: 'Ada' }, b: { id: ids[1], lastName: 'Beta', firstName: 'Bea' },
    template: { id: 'template', name: TEMPLATE_TEAM.players[0] }, missing: { name: 'No ID' }, invalid: null };
  const teams = { Zeta: team(ids[0], true), Alfa: team(ids[0]), Other: team(ids[2]) };
  const before = structuredClone({ db, teams });
  const view = buildPlayersDbView(db, teams);
  assert.deepEqual(view.entries.map(entry => entry.id), ids);
  assert.equal(view.entries[0].teams, 'Alfa, Zeta');
  assert.equal(view.entries[1].teams, '—');
  assert.equal(view.options[0].label, 'Alfa Ada · ' + ids[0]);
  assert.equal(view.options[2].label, 'Existing label · ' + ids[2]);
  assert.equal(view.entries[2].photo, db.z.photo);
  assert.equal(view.countLabel, '3 giocatrici · 1 senza squadra');
  assert.equal(view.primaryId, ids[0]);
  assert.equal(view.secondaryId, ids[1]);
  assert.deepEqual(structuredClone(view), view);
  assert.deepEqual({ db, teams }, before);
});

test('team usage includes players marked out and sorts memberships without changing the source rosters', () => {
  const teams = { Zeta: team(ids[0], true), alfa: team(ids[0]), Empty: null };
  const before = structuredClone(teams);
  assert.deepEqual(buildPlayersDbUsage(teams), { [ids[0]]: ['alfa', 'Zeta'] });
  assert.deepEqual(teams, before);
});

test('empty and single-entry database models preserve default selections and expose detached immutable rows', () => {
  const empty = buildPlayersDbView(null, null);
  assert.equal(empty.primaryId, '');
  assert.equal(empty.secondaryId, '');
  assert.equal(empty.countLabel, '0 giocatrici');
  const entry = { id: ids[0] }, view = buildPlayersDbView({ one: entry }, {});
  assert.equal(view.primaryId, ids[0]);
  assert.equal(view.secondaryId, ids[0]);
  assert.equal(view.options[0].label, 'Giocatrice · ' + ids[0]);
  assert.equal(view.entries[0].onPhoto, undefined);
  entry.photo = 'later';
  assert.equal(view.entries[0].photo, '');
  assert.equal(Object.isFrozen(view.entries[0]), true);
});

const commandSource = readSourceFixture(new URL('../src/features/players/database-commands.js', import.meta.url), 'utf8');
function commandContext(overrides = {}) {
  const calls = [];
  const context = vm.createContext({ PLAYER_PHOTO_REMOVE_RESULT,
    alert: () => calls.push('alert'), confirm: () => { calls.push('confirm'); return true; },
    mergePlayersDbEntries: async () => { calls.push('merge'); return true; }, renderPlayersDbList: () => calls.push('render'),
    updatePlayerPhotoInDbAndTeams: (...args) => calls.push(['update', ...args]),
    pickImageFile: () => { calls.push('pick'); return null; }, preparePlayerPhotoDataUrl: () => { calls.push('prepare'); return 'new-photo'; },
    openPlayerPhotoEditor: () => { calls.push('edit'); return null; }, logError: () => calls.push('error'),
    ...overrides,
  });
  vm.runInContext(commandSource, context);
  return { context, calls };
}

test('photo editing preserves removal, accepted crop and cancellation without extra updates', async () => {
  for (const result of [PLAYER_PHOTO_REMOVE_RESULT, 'cropped', null]) {
    const { context, calls } = commandContext({ openPlayerPhotoEditor: (photo, options) => {
      assert.equal(photo, 'old-photo'); assert.equal(options.allowRemove, true); return result;
    } });
    await context.editPlayersDbPhoto({ id: ids[0], photo: 'old-photo' });
    assert.deepEqual(calls, result ? [['update', ids[0], result === PLAYER_PHOTO_REMOVE_RESULT ? '' : result]] : []);
  }
});

test('adding a photo opens the file picker synchronously and waits for preparation before updating', async () => {
  let resolveFile;
  const file = {}, pending = new Promise(resolve => { resolveFile = resolve; });
  const { context, calls } = commandContext();
  context.pickImageFile = accept => { assert.equal(accept, 'image/*'); calls.push('pick'); return pending; };
  context.preparePlayerPhotoDataUrl = chosen => { assert.equal(chosen, file); calls.push('prepare'); return 'new-photo'; };
  const result = context.editPlayersDbPhoto({ id: ids[0], photo: '' });
  assert.deepEqual(calls, ['pick']);
  resolveFile(file);
  await result;
  assert.deepEqual(calls, ['pick', 'prepare', ['update', ids[0], 'new-photo']]);
});

test('photo picker cancellation leaves data untouched and preparation errors are reported without updating', async () => {
  const { context, calls } = commandContext();
  await context.editPlayersDbPhoto({ id: ids[0] });
  assert.deepEqual(calls, ['pick']);
  calls.length = 0;
  context.pickImageFile = () => ({});
  context.preparePlayerPhotoDataUrl = () => { throw new Error('invalid image'); };
  await context.editPlayersDbPhoto({ id: ids[0] });
  assert.deepEqual(calls, ['error', 'alert']);
});

test('merge validation and declined confirmation never start persistence or refresh', async () => {
  const { context, calls } = commandContext();
  await context.mergeManagedPlayersDb(ids[0], ids[0]);
  assert.deepEqual(calls, ['alert']);
  calls.length = 0;
  context.confirm = () => false;
  await context.mergeManagedPlayersDb(ids[0], ids[1]);
  assert.deepEqual(calls, []);
});

test('successful ID merging refreshes after completion while failed merging leaves the view unchanged', async () => {
  for (const merged of [false, true]) {
    const { context, calls } = commandContext();
    context.mergePlayersDbEntries = async (primary, secondary) => {
      assert.equal(primary, ids[0]); assert.equal(secondary, ids[1]); calls.push('merge'); return merged;
    };
    await context.mergeManagedPlayersDb(ids[0], ids[1]);
    assert.deepEqual(calls, ['confirm', 'merge', ...(merged ? ['render'] : []), 'alert']);
  }
});

const bundle = await build({ stdin: {
  contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {flushSync} from 'react-dom';
    import {PlayersDbModal} from './src/components/layout/PlayersDbModal.jsx'; import {playersDbStore} from './src/state/players-db-store.mjs';
    const root=createRoot(document.getElementById('root')); globalThis.playersDbStore=playersDbStore;
    globalThis.renderPlayers=()=>flushSync(()=>root.render(React.createElement(PlayersDbModal)));
    globalThis.unmountPlayers=()=>flushSync(()=>root.unmount());`, resolveDir: process.cwd(),
}, bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'photo-gesture-probe', setup(build) {
    build.onResolve({ filter: /app\/actions\.mjs$/ }, () => ({ path: 'actions', namespace: 'probe' }));
    build.onLoad({ filter: /.*/, namespace: 'probe' }, () => ({ contents: 'export const actions={}; export const events={editPlayersDbPhoto:(entry)=>globalThis.photoProbe(entry)};' }));
  } }],
});
test('React photo click and keyboard gestures dispatch immediately using cloneable row data', () => {
  const dom = new JSDOM('<div id="root"></div>', { runScripts: 'outside-only' });
  const window = dom.window, calls = [];
  try {
    window.eval(bundle.outputFiles[0].text);
    const row = { id: ids[0], lastName: 'Alfa', firstName: 'Ada', photo: '', teams: 'Home' };
    window.playersDbStore.publish({ open: true, entries: [row], options: [] });
    window.photoProbe = entry => { calls.push(entry); return Promise.resolve(); };
    window.renderPlayers();
    const photo = window.document.querySelector('.players-db-photo-preview');
    photo.click();
    assert.equal(calls[0], row);
    const event = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    photo.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
    assert.equal(calls[1], row);
    assert.deepEqual(structuredClone(calls[0]), row);
  } finally { window.unmountPlayers?.(); window.close(); }
});
