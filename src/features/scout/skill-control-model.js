import {
  SKILLS,
  SKILL_COLORS,
  RESULT_CODES,
  session as matchState,
} from "../../../js/globals.js";

export function createScoutSkillView(player, hasSelection) {
  const context = Object.freeze({ ...player });
  const action = (command, ...args) =>
    Object.freeze({ command, args: Object.freeze([context, ...args]) });
  const view = {
    cancel: hasSelection ? action("cancelScoutSkillSelection") : null,
    groups: [],
  };
  const style = (skill) => {
    const colors = SKILL_COLORS[skill] || { bg: "#2f2f2f", text: "#e5e7eb" };
    return { backgroundColor: colors.bg, color: colors.text };
  };
  return {
    view,
    style,
    action,
    button: (text, className, action, extra = {}) =>
      Object.freeze({ text, className, action, ...extra }),
    group: (className, buttons, header = null, pointerAction = null) => {
      view.groups.push(
        Object.freeze({
          className,
          buttons: Object.freeze(buttons),
          header,
          pointerAction,
        }),
      );
      return Object.freeze(view);
    },
    heading: (skill, text, next = false, colored = false) =>
      Object.freeze({
        text,
        className: "skill-title skill-" + skill + (next ? " next-skill" : ""),
        style: colored ? style(skill) : null,
      }),
    note: (text) => {
      view.note = text;
      return Object.freeze(view);
    },
  };
}
export function getScoutSkillCodes(
  skillId,
  config = matchState.state.metricsConfig,
) {
  const codes = (config[skillId]?.activeCodes || RESULT_CODES).slice();
  if (!codes.includes("/")) codes.push("/");
  if (!codes.includes("=")) codes.push("=");
  return codes.filter((code) => code !== "/" && code !== "=").concat("/", "=");
}

export const SCOUT_SERVE_TYPES = Object.freeze([
  Object.freeze({ id: "F", label: "Float (F)" }),
  Object.freeze({ id: "JF", label: "Jump float (JF)" }),
  Object.freeze({ id: "S", label: "Spin (S)" }),
]);

// Presentation consumes the completed preparation; it never advances the live flow.
export function buildPreparedScoutSkillView(prepared) {
  const { player, hasSelection, kind, picked } = prepared;
  const { playerIdx, activeName } = player;
  const {
    view,
    button,
    style,
    group: buildGroup,
    heading,
    note,
    action,
  } = createScoutSkillView(player, hasSelection);
  const group = (className, buttons, header = null, pointerAction = null) =>
    buildGroup(
      player.inModal ? "modal-skill-codes" : className,
      buttons,
      player.inModal ? null : header,
      pointerAction,
    );
  const playerName = Object.hasOwn(prepared, "playerName")
    ? prepared.playerName
    : activeName;
  const skillLabel = (id) =>
    SKILLS.find((skill) => skill.id === id)?.label || id;
  const evaluation = (skillId, code, tone, restricted = false) =>
    button(
      code,
      "event-btn code-" + tone,
      action("recordScoutSkill", skillId, code, restricted),
      {
        data: { playerIdx, playerName, skillId, code },
      },
    );
  switch (kind) {
    case "empty":
      return Object.freeze(view);
    case "note":
      return note(prepared.text);
    case "serve-error":
      return group(
        "code-grid",
        [evaluation("serve", "=", "negative", true)],
        heading("serve", "Battuta", false, true),
      );
    case "block-confirm":
      return group(
        "code-grid block-confirm-grid",
        [
          button(
            "No muro",
            "event-btn block-confirm-skip",
            action("confirmScoutBlock", false),
          ),
          button(
            "Muro",
            "event-btn block-confirm-go",
            action("confirmScoutBlock", true),
          ),
        ],
        prepared.mobile ? null : heading("block", "Muro"),
      );
    case "picker":
      return group(null, [
        button(
          picked ? skillLabel(picked) : "Seleziona skill",
          "skill-picker-btn skill-single-btn" +
            (picked ? " skill-" + picked : ""),
          action("openScoutSkillPicker", picked),
          { style: picked ? style(picked) : null },
        ),
      ]);
    case "skills":
      return group(
        "skill-grid",
        prepared.skills.map((skill) =>
          button(
            skill.label,
            "skill-picker-btn skill-" + skill.id,
            action("chooseScoutSkill", skill.id),
            { style: style(skill.id) },
          ),
        ),
      );
    case "serve-types":
      return group(
        "code-grid serve-type-grid",
        SCOUT_SERVE_TYPES.map((type) =>
          button(
            type.label,
            "event-btn",
            action("selectScoutServeType", type.id),
          ),
        ),
        heading("serve", "Battuta · tipo"),
        action("setServeTypeFocusPlayer"),
      );
    case "attack-types":
      return group(
        "code-grid attack-select-grid",
        prepared.options.map((option) =>
          button(
            option.label,
            "event-btn" + (option.main ? " attack-main-btn" : ""),
            action("startScoutAttack", option.value, !!option.queued),
          ),
        ),
        heading("attack", "Attacco"),
      );
    case "codes": {
      const buttons = prepared.codes.map(({ code, tone }) =>
        evaluation(picked, code, tone),
      );
      if (prepared.showBack)
        buttons.push(
          button(
            "← Scegli un altro fondamentale",
            "secondary small code-back-btn",
            action("leaveScoutSkillEvaluation"),
          ),
        );
      return group(
        "code-grid",
        buttons,
        heading(picked, skillLabel(picked), prepared.next, true),
      );
    }
    default:
      throw new Error("Unknown scout preparation: " + kind);
  }
}
