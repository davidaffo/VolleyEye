import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readSourceFixture } from "./helpers/source-fixture.mjs";
const source = readSourceFixture(new URL("../src/features/scout/selection-commands.js", import.meta.url), "utf8") + readSourceFixture(
  new URL("../src/features/scout/skill-actions.js", import.meta.url),
  "utf8",
);
function setup() {
  const calls = [];
  const ctx = vm.createContext({
    state: {},
    serveMetaByPlayer: {},
    attackMetaByPlayer: {},
    blockConfirmByPlayer: {},
    blockInlinePlayer: null,
    serveTypeInlinePlayer: null,
    attackInlinePlayer: null,
    queuedSetTypeChoice: null,
    makePlayerKey: (scope, index) => `${scope}:${index}`,
    getAttackMetaForPlayer: (scope, index) => {
      calls.push("metadata");
      return ctx.attackMetaByPlayer[`${scope}:${index}`] || null;
    },
    setSelectedSkillForScope: (...args) => calls.push(["select", ...args]),
    renderPlayers: () => calls.push("render"),
    scheduleRenderPlayers: () => calls.push("schedule"),
    clearServeTypeInlineListener: () => calls.push("clear-serve"),
    clearAttackSelection: (...args) => calls.push(["clear-attack", ...args]),
    resetSkillSelectionForPlayer: (...args) => calls.push(["reset", ...args]),
    forceNextSkill: (skill) => calls.push(["force", skill]),
    saveState: () => calls.push("save"),
    setNextSetType: (value) => calls.push(["next-type", value]),
    setServeTypeFocusPlayer: (...args) => calls.push(["focus", ...args]),
    openSkillCodesModal: (...args) => calls.push(["codes", ...args]),
    openSkillModal: (...args) => calls.push(["picker", ...args]),
    renderSkillCodes: (...args) => calls.push(["modal-codes", ...args]),
    closeSkillModal: () => calls.push("close-modal"),
  });
  vm.runInContext(source, ctx);
  return { ctx, calls };
}
const player = { playerIdx: 2, activeName: "Ada", scope: "opponent" },
  key = "opponent:2";
const action = (command, ...args) => ({ command, args: [player, ...args] });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
for (const skill of ["serve", "attack", "block"])
  test(`a successful ${skill} evaluation reads current metadata and clears only its completed selection`, async () => {
    const { ctx, calls } = setup(),
      pending = deferred(),
      target = { id: "pressed-button" };
    const event = { currentTarget: target },
      cmd = action("recordScoutSkill", skill, "+", false);
    ctx.serveMetaByPlayer[key] = { version: 1 };
    ctx.attackMetaByPlayer[key] = { version: 1 };
    ctx.blockConfirmByPlayer[key] = true;
    ctx.blockInlinePlayer = key;
    ctx.serveMetaByPlayer["our:2"] = { other: true };
    const serve = { version: 2 },
      attack = { version: 2 };
    ctx.serveMetaByPlayer[key] = serve;
    ctx.attackMetaByPlayer[key] = attack;
    let received;
    ctx.handleEventClick = (...args) => {
      received = args;
      calls.push("record");
      return pending.promise;
    };
    const result = ctx.runScoutSkillAction(cmd, event);
    event.currentTarget = null;
    assert.equal(received[0], 2);
    assert.equal(received[1], skill);
    assert.equal(received[4], target);
    assert.equal(received[5].serveMeta, serve);
    assert.equal(received[5].attackMeta, attack);
    assert.equal(received[5].scope, "opponent");
    assert.deepEqual(calls, ["metadata", "record"]);
    assert.equal(ctx.serveMetaByPlayer[key], serve);
    pending.resolve(true);
    await result;
    const extra =
      skill === "serve"
        ? ["clear-serve"]
        : skill === "attack"
          ? [["clear-attack", 2, "opponent"]]
          : [];
    assert.deepEqual(calls, [
      "metadata",
      "record",
      ...extra,
      ["select", "opponent", 2, null],
      "render",
    ]);
    assert.equal(ctx.serveMetaByPlayer[key], undefined);
    assert.deepEqual(ctx.serveMetaByPlayer["our:2"], { other: true });
    assert.equal(
      ctx.blockConfirmByPlayer[key],
      skill === "block" ? undefined : true,
    );
    assert.equal(ctx.blockInlinePlayer, skill === "block" ? null : key);
  });
for (const rejected of [false, true])
  test(`an ${rejected ? "exception" : "uncommitted event"} retains the in-progress scout selection`, async () => {
    const { ctx, calls } = setup(),
      pending = deferred(),
      meta = { inProgress: true };
    ctx.serveMetaByPlayer[key] = meta;
    ctx.blockConfirmByPlayer[key] = true;
    ctx.blockInlinePlayer = key;
    ctx.handleEventClick = () => pending.promise;
    const result = ctx.runScoutSkillAction(
      action("recordScoutSkill", "block", "+", false),
      { currentTarget: {} },
    );
    if (rejected) {
      const failure = Error("not saved");
      pending.reject(failure);
      await assert.rejects(result, (error) => error === failure);
    } else {
      pending.resolve(false);
      await result;
    }
    assert.equal(ctx.serveMetaByPlayer[key], meta);
    assert.equal(ctx.blockConfirmByPlayer[key], true);
    assert.equal(ctx.blockInlinePlayer, key);
    assert.deepEqual(calls, ["metadata"]);
  });
test("the restricted serve error preserves pending metadata and passes only its team scope", async () => {
  const { ctx, calls } = setup(),
    meta = { pending: true };
  let options;
  ctx.serveMetaByPlayer[key] = meta;
  ctx.handleEventClick = (...args) => {
    options = args[5];
    return true;
  };
  await ctx.runScoutSkillAction(
    action("recordScoutSkill", "serve", "=", true),
    { currentTarget: {} },
  );
  assert.deepEqual(Object.keys(options), ["scope"]);
  assert.equal(options.scope, "opponent");
  assert.equal(ctx.serveMetaByPlayer[key], meta);
  assert.deepEqual(calls, [
    "clear-serve",
    ["select", "opponent", 2, null],
    "render",
  ]);
});
test("an explicitly chosen queued attack consumes its type after completion and marks metadata after its callback", async () => {
  const { ctx, calls } = setup(),
    pending = deferred();
  let done;
  ctx.queuedSetTypeChoice = "Fast";
  ctx.startAttackSelection = (idx, choice, onDone, scope) => {
    assert.equal(idx, 2);
    assert.equal(choice, "Fast");
    assert.equal(scope, "opponent");
    done = onDone;
    return pending.promise;
  };
  ctx.renderPlayers = () =>
    calls.push(["render", !!ctx.attackMetaByPlayer[key]?.fromNextSetType]);
  const result = ctx.runScoutSkillAction(
    action("startScoutAttack", "Fast", true),
  );
  assert.equal(ctx.queuedSetTypeChoice, "Fast");
  ctx.attackMetaByPlayer[key] = {};
  done();
  pending.resolve();
  await result;
  assert.equal(ctx.attackMetaByPlayer[key].fromNextSetType, true);
  assert.equal(ctx.queuedSetTypeChoice, null);
  assert.deepEqual(calls, [
    ["render", false],
    ["next-type", ""],
  ]);
});
test("the automatic queued setter attack consumes its choice before opening and marks metadata before rendering", () => {
  const { ctx, calls } = setup();
  let done;
  ctx.queuedSetTypeChoice = "Damp";
  ctx.startAttackSelection = (_idx, choice, onDone) => {
    assert.equal(ctx.queuedSetTypeChoice, null);
    assert.equal(choice, "Damp");
    calls.push("open");
    done = onDone;
  };
  ctx.renderPlayers = () =>
    calls.push(["render", !!ctx.attackMetaByPlayer[key]?.fromNextSetType]);
  ctx.startQueuedSetterAttack(player, "Damp");
  ctx.attackMetaByPlayer[key] = {};
  done();
  assert.deepEqual(calls, [["next-type", ""], "open", ["render", true]]);
});
for (const scope of ["our", "opponent"])
  test(`skipping the block keeps the existing flow update order (${scope})`, () => {
    const { ctx, calls } = setup(),
      info = { ...player, scope },
      id = `${scope}:2`;
    ctx.blockConfirmByPlayer[id] = true;
    ctx.blockInlinePlayer = id;
    ctx.runScoutSkillAction({
      command: "confirmScoutBlock",
      args: [info, false],
    });
    assert.equal(ctx.blockInlinePlayer, null);
    assert.equal(ctx.blockConfirmByPlayer[id], undefined);
    assert.deepEqual(calls, [
      ["select", scope, 2, null],
      ...(scope === "our" ? [["force", "defense"]] : ["save"]),
      "schedule",
    ]);
    if (scope === "opponent")
      assert.equal(ctx.state.opponentSkillFlowOverride, "defense");
  });
test("pointer focus and mobile pickers run immediately through the shared dispatcher", () => {
  const { ctx, calls } = setup();
  ctx.runScoutSkillAction(action("setServeTypeFocusPlayer"));
  ctx.runScoutSkillAction(action("openScoutSkillPicker", "pass"));
  ctx.runScoutSkillAction(action("openScoutSkillPicker", null));
  assert.deepEqual(calls, [
    ["focus", 2, "opponent"],
    ["codes", 2, "Ada", "pass", "opponent"],
    ["picker", 2, "Ada", "opponent"],
  ]);
  assert.throws(
    () => ctx.runScoutSkillAction({ command: "toString", args: [] }),
    /sconosciuta/,
  );
});

for (const success of [false, true])
  test(`a modal evaluation closes only after a successful record (${success})`, async () => {
    const { ctx, calls } = setup(),
      pending = deferred(),
      modalPlayer = { ...player, inModal: true, skillId: "attack" };
    ctx.attackMetaByPlayer[key] = { fromNextSetType: true };
    ctx.serveMetaByPlayer[key] = {};
    ctx.blockConfirmByPlayer[key] = true;
    ctx.handleEventClick = () => pending.promise;
    const result = ctx.runScoutSkillAction(
      {
        command: "recordScoutSkill",
        args: [modalPlayer, "attack", "+", false],
      },
      { currentTarget: {} },
    );
    assert.deepEqual(calls, ["metadata"]);
    pending.resolve(success);
    await result;
    assert.deepEqual(
      calls,
      success
        ? [
            "metadata",
            ["next-type", ""],
            ["clear-attack", 2, "opponent"],
            "close-modal",
          ]
        : ["metadata"],
    );
    assert.equal(ctx.blockConfirmByPlayer[key], true);
  });
test("a queued modal attack updates metadata and consumes its type before redrawing modal codes", async () => {
  const { ctx, calls } = setup(),
    pending = deferred(),
    modalPlayer = { ...player, inModal: true, skillId: "attack" };
  let done;
  ctx.queuedSetTypeChoice = "Fast";
  ctx.startAttackSelection = (_idx, _choice, onDone) => {
    done = onDone;
    return pending.promise;
  };
  ctx.renderSkillCodes = (...args) =>
    calls.push([
      "modal-codes",
      ...args,
      ctx.attackMetaByPlayer[key].fromNextSetType,
      ctx.queuedSetTypeChoice,
    ]);
  const result = ctx.runScoutSkillAction({
    command: "startScoutAttack",
    args: [modalPlayer, "Fast", true],
  });
  assert.equal(ctx.queuedSetTypeChoice, "Fast");
  ctx.attackMetaByPlayer[key] = {};
  done();
  pending.resolve();
  await result;
  assert.deepEqual(calls, [
    ["next-type", ""],
    ["modal-codes", 2, "Ada", "attack", "opponent", true, null],
  ]);
});
test("modal serve selection redraws the modal instead of the court", async () => {
  const { ctx, calls } = setup(),
    modalPlayer = { ...player, inModal: true, skillId: "serve" };
  ctx.startServeTypeSelection = (idx, type, onDone, scope) => {
    assert.equal(idx, 2);
    assert.equal(type, "JF");
    assert.equal(scope, "opponent");
    onDone();
  };
  await ctx.runScoutSkillAction({
    command: "selectScoutServeType",
    args: [modalPlayer, "JF"],
  });
  assert.deepEqual(calls, [["modal-codes", 2, "Ada", "serve", "opponent"]]);
});
test("modal controls share the cloneable command schema and record through the same dispatcher", async () => {
  const { ctx, calls } = setup();
  let view = {};
  Object.assign(ctx, {
    SKILLS: [{ id: "pass", label: "Ricezione" }],
    RESULT_CODES: ["+", "!"],
    SKILL_COLORS: {},
    setSkillModalCancelVisibility: () => {},
    getPredictedSkillIdForScope: () => null,
    getPredictedSkillId: () => null,
    updateSetTypeVisibility: () => {},
    skillModalStore: {
      publish: (next) => {
        view = { ...view, ...next };
      },
    },
    getPlayersForScope: () => ["X", "Y", "Ada"],
    getPlayerNumbersForScope: () => ({}),
    formatNameWithNumberFor: (name) => name,
    getCodeTone: () => "neutral",
    handleEventClick: () => true,
  });
  vm.runInContext(
    readSourceFixture(
      new URL("../src/features/scout/skill-control-model.js", import.meta.url),
      "utf8",
    ),
    ctx,
  );
  vm.runInContext(
    readSourceFixture(
      new URL("../src/features/scout/skill-dialog.js", import.meta.url),
      "utf8",
    ),
    ctx,
  );
  ctx.publishSkillModalCodes(2, "Ada", "pass", "opponent");
  assert.deepEqual(
    JSON.parse(JSON.stringify(structuredClone(view.controls))),
    JSON.parse(JSON.stringify(view.controls)),
  );
  const buttons = view.controls.groups[0].buttons;
  assert.deepEqual(
    Array.from(buttons, (button) => button.text),
    ["+", "!", "/", "="],
  );
  assert.ok(
    buttons.every(
      (button) =>
        button.action.command === "recordScoutSkill" &&
        button.action.args[0].inModal,
    ),
  );
  await ctx.runScoutSkillAction(buttons[1].action, { currentTarget: {} });
  assert.deepEqual(calls, ["metadata", "close-modal"]);
});
