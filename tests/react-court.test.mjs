import {reference} from "./helpers/ui-reference.mjs";
import assert from "node:assert/strict";
import { readSourceFixture as readFileSync } from './helpers/source-fixture.mjs';
import vm from "node:vm";
import test from "node:test";
import { JSDOM } from "jsdom";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const model = read("../src/features/scout/skill-control-model.js") + read("../src/features/scout/skill-actions.js") + read("../src/features/scout/skill-preparation.js");
const globals = read("../js/globals.js").split("const PERSISTENT_DB_NAME")[0];
function setup(options) {
  const dom = new JSDOM('<div id="target"></div>');
  const calls = [];
  const context = vm.createContext({
    document: dom.window.document,
    window: { matchMedia: () => ({ matches: !!options.mobile }) },
    state: {
      useOpponentTeam: !!options.double,
      predictiveSkillFlow: !!options.predictive,
      forceSkillActive: false,
      metricsConfig: {},
      pendingServe: options.pending || null,
    },
    selected: options.selected || null,
    attackInlinePlayer: options.attackInline || null,
    blockInlinePlayer: options.blockInline || null,
    serveTypeInlinePlayer: options.serveInline || null,
    blockConfirmByPlayer: options.confirmed ? { "our:0": true } : {},
    serveMetaByPlayer: {},
    attackMetaByPlayer: {},
    queuedSetTypeChoice: options.queued || null,
    makePlayerKey: (scope, index) => scope + ":" + index,
    getSelectedSkillForScope() {
      return context.selected;
    },
    setSelectedSkillForScope(scope, index, value) {
      context.selected = value;
      calls.push(["select", scope, index, value]);
    },
    getAttackMetaForPlayer: () => options.attackMeta || null,
    getActiveAttackKeyForScope: () => options.activeAttack || null,
    getNetBlockPromptScope: () => (options.blockPrompt ? "our" : null),
    isForcedBlockScope: () => false,
    getEnabledSkillsForScope: () =>
      vm.runInContext(
        "SKILLS.filter(skill => !" +
          JSON.stringify(options.disabled || []) +
          ".includes(skill.id))",
        context,
      ),
    isSkillEnabledForScope: () => true,
    getServerPlayerForScope: () => ({ idx: 0, name: "A" }),
    getActiveServerName: () => "A",
    isPostServeLockForScope: () => !!options.postServe,
    getAutoFlowState: () => options.flow || null,
    getServeBaseZoneForPlayer: () => options.zone ?? 1,
    isBlockEligibleForScope: () => options.blockEligible !== false,
    isPlayerKeyInScope: (key, scope) => key?.startsWith(scope + ":"),
    shouldSkipBlockConfirm: () => !!options.skipBlock,
    resolveFlowSkillForScope: (_scope, skill) => skill,
    getPredictedSkillIdForScope: () => "block",
    normalizeSetTypeValue: (value) => value,
    isSetterPlayerForScope: () => !!options.setter,
    shouldPromptAttackSetType: () => !!options.promptAttack,
    DEFAULT_SET_TYPE_OPTIONS: [
      { value: "Fast", label: "Fast" },
      { value: "High", label: "Alta" },
    ],
    formatSetTypeLabelWithShortcut: (_value, label) => label,
    getCodeTone: (_skill, code) => (code === "=" ? "negative" : "neutral"),
    renderPlayers: () => calls.push(["render"]),
    scheduleRenderPlayers: () => calls.push(["schedule"]),
    clearServeTypeInlineListener: () => calls.push(["clear-serve"]),
    clearAttackSelection: () => calls.push(["clear-attack"]),
    bindServeTypeInlineListener: () => calls.push(["bind-serve"]),
    startAttackSelection: () => calls.push(["start-attack"]),
    setServeTypeFocusPlayer: () => calls.push(["focus-serve"]),
    setNextSetType: (value) => calls.push(["set-type", value]),
  });
  vm.runInContext(globals + model, context);
  return { dom, context, calls };
}
function buttonInfo(button) {
  return [
    button.textContent,
    button.className,
    button.dataset.playerIdx || null,
    button.dataset.playerName || null,
    button.dataset.skillId || null,
    button.dataset.code || null,
    button.style.backgroundColor,
    button.style.color,
  ];
}
const scenarios = [
  ["manual desktop", {}],
  ["ricezione desktop", { selected: "pass" }],
  ["battuta desktop", { next: "serve" }],
  ["battuta fuori zona 1", { next: "serve", zone: 2 }],
  ["battuta già in selezione", { next: "serve", serveInline: "our:1" }],
  ["attacco con tipo", { next: "attack", promptAttack: true }],
  ["attacco senza tipo", { next: "attack" }],
  [
    "attacco con tipo accodato",
    { next: "attack", promptAttack: true, queued: "Fast" },
  ],
  [
    "damp del palleggiatore",
    { next: "attack", promptAttack: true, queued: "Damp", setter: true },
  ],
  ["attacco da valutare", { next: "attack", attackMeta: {} }],
  ["muro da confermare", { next: "block" }],
  ["muro confermato", { next: "block", confirmed: true }],
  ["muro senza conferma", { next: "block", skipBlock: true }],
  ["muro altra giocatrice", { next: "block", blockInline: "our:1" }],
  ["difesa durante prompt muro", { next: "block", blockPrompt: true }],
  ["fondamentale disabilitato", { selected: "pass", disabled: ["pass"] }],
  ["attacco di altra giocatrice", { activeAttack: "our:1" }],
  ["mobile senza previsione", { mobile: true }],
  ["mobile ricezione", { mobile: true, next: "pass" }],
  ["mobile battuta fuori zona", { mobile: true, next: "serve", zone: 2 }],
  ["mobile muro", { mobile: true, next: "block" }],
  [
    "mobile muro escluso",
    { mobile: true, next: "block", blockEligible: false },
  ],
  ["mobile muro confermato", { mobile: true, next: "block", confirmed: true }],
  [
    "battuta pendente",
    {
      double: true,
      predictive: true,
      pending: { scope: "our", playerIdx: 0, playerName: "A" },
    },
  ],
  [
    "battuta pendente mobile",
    {
      mobile: true,
      double: true,
      predictive: true,
      pending: { scope: "our", playerIdx: 0, playerName: "A" },
    },
  ],
  ["blocco dopo battuta", { double: true, predictive: true, postServe: true }],
  [
    "errore battuta durante ricezione avversaria",
    {
      double: true,
      predictive: true,
      flow: { teamScope: "opponent", skillId: "pass" },
    },
  ],
  [
    "attesa avversaria",
    {
      double: true,
      predictive: true,
      flow: { teamScope: "opponent", skillId: "attack" },
    },
  ],
];
for (const [name, options] of scenarios)
  test("React court preserves legacy actions: " + name, () => {
    const next = setup(options);
    const view = next.context.buildPreparedScoutSkillView(next.context.prepareScoutSkillControls(0, "A", {
      scope: "our",
      nextSkillId: options.next || null,
    }));
    assert.deepEqual(JSON.parse(JSON.stringify(view)), JSON.parse(JSON.stringify(structuredClone(view))));
    const buttons = [];
    if (view.cancel) {
      const button = next.dom.window.document.createElement("button");
      button.className = "player-skill-cancel";
      button.textContent = "✕";
      buttons.push(buttonInfo(button));
    }
    for (const group of view.groups)
      for (const item of group.buttons) {
        const button = next.dom.window.document.createElement("button");
        button.textContent = item.text;
        button.className = item.className;
        Object.assign(button.dataset, item.data || {});
        Object.assign(button.style, item.style || {});
        buttons.push(buttonInfo(button));
      }
    assert.deepEqual(
      buttons,
      reference("react-court:7193"),
    );
    assert.deepEqual(
      Array.from(
        view.groups.filter((group) => group.className),
        (group) => [group.className, group.header?.text || ""],
      ),
      reference("react-court:7302"),
    );
    assert.equal(
      view.note || "",
      reference("react-court:7658"),
    );
    assert.deepEqual(next.calls, reference("react-court:7771"));
    assert.equal(next.context.selected, reference("react-court:7816"));
    next.dom.window.close();
  });

test('serve preparation binds once and presentation can repeat without touching the live flow', () => {
  const { context, calls, dom } = setup({ next: 'serve' });
  try {
    const prepared = context.prepareScoutSkillControls(0, 'A', { nextSkillId: 'serve' });
    assert.equal(prepared.kind, 'serve-types');
    assert.deepEqual(calls, [['bind-serve']]);
    const before = JSON.stringify(prepared);
    const first = context.buildPreparedScoutSkillView(structuredClone(prepared));
    const second = context.buildPreparedScoutSkillView(structuredClone(prepared));
    assert.equal(JSON.stringify(first), JSON.stringify(second));
    assert.equal(JSON.stringify(prepared), before);
    assert.deepEqual(calls, [['bind-serve']]);
  } finally { dom.window.close(); }
});

test('queued setter preparation consumes the choice before starting the automatic attack', () => {
  const { context, calls, dom } = setup({ queued: 'Damp', setter: true, promptAttack: true });
  try {
    const prepared = context.prepareScoutSkillControls(0, 'A', { nextSkillId: 'attack' });
    assert.equal(prepared.kind, 'empty');
    assert.equal(context.queuedSetTypeChoice, null);
    assert.deepEqual(calls, [['set-type', ''], ['start-attack']]);
    context.buildPreparedScoutSkillView(structuredClone(prepared));
    context.buildPreparedScoutSkillView(structuredClone(prepared));
    assert.deepEqual(calls, [['set-type', ''], ['start-attack']]);
  } finally { dom.window.close(); }
});

test('predictive serve preparation transfers metadata and clears the selection before scheduling', () => {
  const { context, calls, dom } = setup({ double: true, predictive: true, selected: 'serve' });
  try {
    const meta = { serveType: 'F' };
    context.serveMetaByPlayer['our:0'] = meta;
    context.scheduleRenderPlayers = () => {
      assert.equal(context.state.pendingServe.meta, meta);
      assert.equal(context.selected, null);
      assert.equal(context.serveMetaByPlayer['our:0'], undefined);
      calls.push(['schedule']);
    };
    const prepared = context.prepareScoutSkillControls(0, 'A');
    assert.equal(prepared.kind, 'empty');
    assert.equal(prepared.hasSelection, true);
    assert.deepEqual(calls, [['select', 'our', 0, null], ['schedule']]);
    context.buildPreparedScoutSkillView(structuredClone(prepared));
    assert.deepEqual(calls, [['select', 'our', 0, null], ['schedule']]);
  } finally { dom.window.close(); }
});
