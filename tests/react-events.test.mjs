import {reference} from "./helpers/ui-reference.mjs";
import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import vm from "node:vm";
import test from "node:test";
import { JSDOM } from "jsdom";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const old = read("../src/features/events/point-direction.js") + read("../src/features/video/event-editor.js"),
  model = read("../src/features/events/display-model.js") + read("../src/features/events/table-model.js") + read("../src/features/events/edit-model.js") + read("../src/features/events/table-view.js") + read("../src/features/events/table-commands.js"),
  live = read("../src/domain/value-string.js") + read("../src/features/live/live-entry.js"),
  adapter = read("../src/features/events/editor-controls.js");
function setup() {
  const dom = new JSDOM('<div id="target"></div>'),
    state = {
      selectedTeam: "Casa",
      selectedOpponentTeam: "Ospite",
      players: ["Rossi Sara", "Verdi Anna"],
      opponentPlayers: ["Avversaria Uno"],
      playerNumbers: {},
      opponentPlayerNumbers: {},
      events: [],
    };
  let latest;
  const context = vm.createContext({
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    state,
    selectedEventIds: new Set(),
    lastSelectedEventId: null,
    bulkEditActive: true,
    eventTableContexts: {},
    SKILLS: [
      { id: "serve", label: "Battuta" },
      { id: "pass", label: "Ricezione" },
      { id: "manual", label: "Manuale" },
    ],
    RESULT_CODES: ["#", "+", "!", "-", "=", "/"],
    ERROR_TYPES: [{ id: "net", label: "Rete" }],
    DEFAULT_BASE_OPTIONS: [{ value: "K1", label: "K1" }],
    DEFAULT_SET_TYPE_OPTIONS: [{ value: "Fast", label: "Fast" }],
    DEFAULT_PHASE_OPTIONS: [
      { value: "bp", label: "BP" },
      { value: "so", label: "SO" },
    ],
    BULK_EDIT_CONFIG: new Proxy({}, { get: () => ({}) }),
    getTeamScopeFromEvent: (ev) =>
      ev.team === "opponent" ? "opponent" : "our",
    getPlayersForScope: (scope) =>
      scope === "opponent" ? state.opponentPlayers : state.players,
    getPlayerNumbersForScope: () => ({}),
    formatNameWithNumber: (name) => name,
    formatNameWithNumberFor: (name) => name,
    resolvePlayerIdx: (ev) => ev.playerIdx ?? -1,
    formatVideoTimestamp: (time) => String(time),
    computeEventVideoTime: (ev) => ev.videoTime ?? 0,
    getErrorTypeLabel: (type) => type,
    getEventKey: (ev, index) => ev.eventId ?? index,
    formatAttackPhaseLabel: (value) =>
      value === true ? "BP" : value === false ? "SO" : "",
    normalizePhaseValue: (value) =>
      value === true ? "bp" : value === false ? "so" : "",
    getPlayerIdForScope: (scope, index) => scope + index,
    getTeamNameForScope: (scope) => (scope === "our" ? "Casa" : "Ospite"),
    makeEditableCell: () => {},
    removeEventTableContext: () => {},
    registerEventTableContext: () => {},
    handleSeekForSelection: () => {},
    updateSelectionStyles: () => {},
    scrollRowIntoView: () => {},
    refreshAfterVideoEdit: () => {},
    markVideoUndoCapture: () => {},
    pushVideoUndoSnapshot: () => {},
    setSelectionForContext: () => {},
    closeCurrentEdit: () => {},
    eventTableStore: {
      publish: (id, view) => {
        latest = view;
      },
    },
    console,
  });
  vm.runInContext(
    live +
      old +
      adapter +
      model,
    context,
  );
  return { context, dom, view: () => latest };
}
const events = [
  {
    eventId: 1,
    t: 1,
    set: 1,
    team: "our",
    playerIdx: 0,
    skillId: "serve",
    code: "+",
    homeScore: 0,
    visitorScore: 1,
    serveType: "JF",
    serveStart: { x: 0.15, y: 0.7 },
    serveEnd: { x: 0.8, y: 0.4 },
    durationMs: 0,
  },
  {
    eventId: 2,
    set: 2,
    team: "opponent",
    playerName: "Avversaria Uno",
    skillId: "attack",
    code: "=",
    fromFreeball: true,
    setterName: "Setter",
    attackBp: false,
    attackDirection: { start: { x: 0.4, y: 0.2 }, end: { x: 0.8, y: 0.9 } },
    relatedEvents: [1, 3],
  },
  {
    eventId: 3,
    skillId: "manual",
    code: "error",
    errorType: "net",
    playerName: "Rossi Sara",
    teamName: "Storica",
  },
  { eventId: 4, actionType: "timeout", set: 3 },
  {
    eventId: 5,
    actionType: "substitution",
    playerIn: "Verdi Anna",
    playerOut: "Rossi Sara",
    durationMs: 1200,
  },
];
for (const flags of [
  { showVideoTime: true },
  { showIndex: false, showCheckbox: false },
  { showVideoTime: true, enableSelection: false },
])
  test(
    "tabella React conserva intestazioni e valori: " + JSON.stringify(flags),
    () => {
      const { context, dom, view } = setup(),
        target = dom.window.document.getElementById("target");
      const input = structuredClone(events);
      context.state.events = input;



      context.publishReactEventTable(target.id, input, flags);
      const native = view();
      assert.deepEqual(
        JSON.parse(
          JSON.stringify(
            native.rows.map((row) => [
              ...(native.showCheckbox ? [""] : []),
              ...row.cells.map((cell) => cell.text),
              "✕",
            ]),
          ),
        ),
        reference("react-events:5077"),
      );
      assert.deepEqual(
        JSON.parse(
          JSON.stringify(
            native.headers.map((header) =>
              header.checkbox ? "" : header.label,
            ),
          ),
        ),
        reference("react-events:5376"),
      );
    },
  );
for (const field of [
  "player",
  "setter",
  "skill",
  "code",
  "rotation",
  "base",
  "setType",
  "serveType",
  "receiveEvaluation",
  "attackEvaluation",
  "attackBp",
  "playerIn",
  "durationMs",
  "combination",
  "relatedEvents",
  "errorType",
  "fromFreeball",
  "team",
  "homeScore",
])
  test("editor React conserva la modifica del campo " + field, () => {
    const { context, dom } = setup(),
      first = { ...events[0], rotation: 1 },
      second = structuredClone(first),
      scope = context;
    const view = scope.buildReactEventControl(second, field, null, 0),
      value =
        field === "fromFreeball"
          ? true
          : field === "relatedEvents"
            ? "12; 13"
            : field === "combination"
              ? '["K1"]'
              : field === "team"
                ? "opponent"
                : view.type === "select"
                  ? view.options.at(-1).value
                  : "2750";
    view.onChange(value);
    assert.deepEqual(
      JSON.parse(JSON.stringify(second)),
      reference("react-events:8096"),
    );
  });

test('editing an event captures one undo snapshot before changes and refreshes views after completion', () => {
  const {context, view} = setup(), calls = [];
  const ev = {eventId: 11, homeScore: 0, skillId: 'serve', team: 'our'};
  context.pushVideoUndoSnapshot = () => calls.push(['undo', ev.homeScore]);
  context.refreshAfterVideoEdit = full => calls.push(['refresh', full, ev.homeScore]);
  context.setSelectionForContext = (_key, ids) => {context.selectedEventIds = ids; calls.push(['select']);};
  context.closeCurrentEdit = () => calls.push(['close']);
  context.renderVideoAnalysis = () => calls.push(['video']);
  context.renderEventsLog = () => calls.push(['log']);
  context.publishReactEventTable('target', [ev], {contextKey: 'video'});
  const row = view().rows[0];
  const cell = row.cells.find(cell => cell.field === 'homeScore');
  const control = context.editEventCell(row, cell.field, view().interaction);
  control.onChange('2');
  control.onChange('3');
  context.finishEventCellEdit(cell.field);
  assert.equal(ev.homeScore, 3);
  assert.deepEqual(calls, [['select'], ['close'], ['undo', 0], ['refresh', true, 2], ['refresh', true, 3], ['video'], ['log']]);
});

test('event table publication retains cloneable row data without touching the DOM', () => {
  const { context, view } = setup();
  Object.defineProperty(context, 'document', { get() { throw new Error('Unexpected DOM access'); } });
  context.publishReactEventTable('target', structuredClone(events), { contextKey: 'video', showVideoTime: true });
  assert.deepEqual(JSON.parse(JSON.stringify(structuredClone(view().rows))), JSON.parse(JSON.stringify(view().rows)));
  assert.equal(view().rows[0].cells.some(cell => typeof cell.onEdit === 'function'), false);
});

test('event table gestures preserve range, modifier, plain selection and disabled selection', () => {
  const { context, view } = setup(), calls = [];
  context.publishReactEventTable('target', [events[0]], { contextKey: 'video' });
  const row = view().rows[0], table = view().interaction;
  context.selectedEventIds = new Set([row.key]);
  context.lastSelectedEventId = row.key;
  context.getRowsForContext = key => context.eventTableContexts[key].rows;
  context.scrollRowIntoView = record => calls.push(['scroll', record.key]);
  context.selectRangeForContext = (...args) => calls.push(['range', ...args.slice(0, 3)]);
  context.toggleSelectionForContext = (key, id) => calls.push(['toggle', key, id]);
  context.setSelectionForContext = (key, ids, anchor) => calls.push(['select', key, [...ids], anchor]);
  context.selectEventTableRow(row, table, { shiftKey: true });
  context.selectEventTableRow(row, table, { ctrlKey: true });
  context.selectEventTableRow(row, table, {});
  context.selectEventTableRow(row, { ...table, enableSelection: false }, {});
  assert.deepEqual(calls, [
    ['range', 'video', row.key, row.key], ['scroll', row.key],
    ['toggle', 'video', row.key], ['scroll', row.key],
    ['select', 'video', [row.key], row.key], ['scroll', row.key],
  ]);
});

test('header sorting runs before bulk selection is read from the refreshed context', () => {
  const { context } = setup(), calls = [];
  let selected = [1, 2];
  context.getSelectedRows = () => selected;
  context.openBulkEditModal = (...args) => calls.push(['bulk', ...args]);
  const table = { contextKey: 'video', options: { onSortChange: key => { calls.push(['sort', key]); selected = []; } } };
  const header = { sortKey: 'set', bulkKey: 'set' };
  context.handleEventTableHeader(table, header);
  assert.deepEqual(calls, [['sort', 'set']]);
  selected = [1, 2];
  table.options.onSortChange = key => calls.push(['sort', key]);
  context.handleEventTableHeader(table, header);
  assert.deepEqual(calls.slice(1), [['sort', 'set'], ['bulk', 'video', 'set']]);
});
