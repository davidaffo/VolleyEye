import { expandDvwCompoundToken, normalizeDvwScoutToken } from "../io/datavolley-codec.js";
import { parseDvwSuffixMeta, parseDvwZoneMeta } from "../io/datavolley-export.js";
import { getDvwScoutSkillLabel, getDvwScoutTypeLabel, getDvwScoutEvalLabel, getDvwScoutChipSkillClass, renderDvwScoutPending, setDvwScoutStatus } from "../io/datavolley-live-entry.js";
import { session as teamManagementState } from "../state/live-team-management.js";
import { dvwEntryStore } from "../../state/roster-import-store.mjs";

export function buildReactDvwGroup(title, className, entries = [], options = {}) {
  return { title, className, entries, placeholder: !!options.placeholder };
}

export function buildReactDvwCommand(title, text) {
  return {
    groups: [{ title, text, className: "scout-dvw-breakdown__group--command" }],
  };
}

export function buildReactDvwSuggestion(value) {
  return value?.corrected && value.normalized
    ? { label: "Autocorrezione", code: value.normalized }
    : null;
}

export function buildReactDvwBreakdown(rawInput) {
  const raw = String(rawInput || "").trim();
  if (!raw) {
    const main = buildReactDvwGroup(
      "Main code",
      "scout-dvw-breakdown__group--main",
      [
        { label: "Team", value: "" },
        { label: "N", value: "" },
        { label: "Skill", value: "" },
        { label: "Type", value: "" },
        { label: "Val", value: "" },
      ],
      { placeholder: true },
    );
    const advanced = buildReactDvwGroup(
      "Advanced",
      "scout-dvw-breakdown__group--advanced",
      [
        { label: "Cmb", value: "" },
        { label: "Inline", value: "" },
        { label: "Start", value: "" },
        { label: "End", value: "" },
        { label: "End+", value: "" },
      ],
      { placeholder: true },
    );
    const extended = buildReactDvwGroup(
      "Extended",
      "scout-dvw-breakdown__group--extended",
      [
        { label: "Skill type", value: "" },
        { label: "Players", value: "" },
        { label: "Special", value: "" },
      ],
      { placeholder: true },
    );
    return { groups: [main, advanced, extended] };
  }
  const compound = expandDvwCompoundToken(raw);
  if (compound && compound.length > 1) {
    const items = compound
      .map((item) => normalizeDvwScoutToken(item))
      .filter((item) => item.parsed && item.parsed.kind === "skill");
    const suggestion = { label: "Compound", code: compound.join(" · ") };
    const groups = items.map((item, idx) => {
      const parsed = item.parsed;
      const suffixMeta = parseDvwSuffixMeta(
        parsed.skillLetter,
        parsed.inlineCode,
        parsed.suffix || "",
      );
      const zoneMeta = parsed.zoneMeta || parseDvwZoneMeta(parsed.zonePair);
      return buildReactDvwGroup(
        idx === 0 ? "Skill 1" : `Skill ${idx + 1}`,
        idx === 0
          ? "scout-dvw-breakdown__group--main"
          : "scout-dvw-breakdown__group--advanced",
        [
          { label: "Team", value: parsed.teamScope === "opponent" ? "V" : "H" },
          { label: "N", value: parsed.playerNumber },
          { label: "Skill", value: getDvwScoutSkillLabel(parsed.skillLetter) },
          {
            label: "Type",
            value: `${parsed.typeLetter} · ${getDvwScoutTypeLabel(parsed.typeLetter, parsed.skillLetter)}`,
          },
          { label: "Val", value: getDvwScoutEvalLabel(parsed.evaluation) },
          {
            label: "Dir",
            value:
              zoneMeta.startZone || zoneMeta.endZone
                ? `${zoneMeta.startZone || "·"}${zoneMeta.endZone || "·"}${zoneMeta.endSubzone || ""}`
                : "",
          },
          {
            label: "Ext",
            value: [
              suffixMeta.skillSubtype,
              Number.isFinite(suffixMeta.numPlayersNumeric)
                ? suffixMeta.numPlayersNumeric
                : "",
              suffixMeta.specialCode,
            ]
              .filter(Boolean)
              .join(" "),
          },
        ],
      );
    });
    return { suggestion, groups };
  }
  const normalized = normalizeDvwScoutToken(raw);
  const parsed = normalized.parsed;
  if (parsed && parsed.kind === "skill") {
    const suffixMeta = parseDvwSuffixMeta(
      parsed.skillLetter,
      parsed.inlineCode,
      parsed.suffix || "",
    );
    const zoneMeta = parsed.zoneMeta || parseDvwZoneMeta(parsed.zonePair);
    const suggestion = buildReactDvwSuggestion(normalized);
    const main = buildReactDvwGroup(
      "Main code",
      "scout-dvw-breakdown__group--main",
      [
        { label: "Team", value: parsed.teamScope === "opponent" ? "V" : "H" },
        { label: "N", value: parsed.playerNumber },
        { label: "Skill", value: getDvwScoutSkillLabel(parsed.skillLetter) },
        {
          label: "Type",
          value: `${parsed.typeLetter} · ${getDvwScoutTypeLabel(parsed.typeLetter, parsed.skillLetter)}`,
        },
        { label: "Val", value: getDvwScoutEvalLabel(parsed.evaluation) },
      ],
    );
    const advanced = buildReactDvwGroup(
      "Advanced",
      "scout-dvw-breakdown__group--advanced",
      [
        { label: "Cmb", value: parsed.advancedCode || "" },
        { label: "Inline", value: parsed.inlineCode || "" },
        { label: "Start", value: zoneMeta.startZone || "" },
        { label: "End", value: zoneMeta.endZone || "" },
        { label: "End+", value: zoneMeta.endSubzone || "" },
      ],
    );
    const extended = buildReactDvwGroup(
      "Extended",
      "scout-dvw-breakdown__group--extended",
      [
        { label: "Skill type", value: suffixMeta.skillSubtype || "" },
        {
          label: "Players",
          value: Number.isFinite(suffixMeta.numPlayersNumeric)
            ? String(suffixMeta.numPlayersNumeric)
            : "",
        },
        { label: "Special", value: suffixMeta.specialCode || "" },
      ],
    );
    return { suggestion, groups: [main, advanced, extended] };
  }
  if (parsed && parsed.kind === "timeout") {
    return buildReactDvwCommand(
      "Comando",
      `Timeout ${parsed.teamScope === "opponent" ? "avversario" : "nostro"}.`,
    );
  }
  if (parsed && parsed.kind === "substitution") {
    return buildReactDvwCommand(
      "Comando",
      `Cambio ${parsed.teamScope === "opponent" ? "avversario" : "nostro"} · entra ${parsed.playerInNumber} · esce ${parsed.playerOutNumber}.`,
    );
  }
  if (parsed && parsed.kind === "point-marker") {
    return buildReactDvwCommand(
      "Comando",
      `Point marker ${parsed.teamScope === "opponent" ? "avversario" : "nostro"} · tipo ${parsed.pointType || "—"} · val ${parsed.evaluation || "—"}.`,
    );
  }
  if (parsed && parsed.kind === "score") {
    return buildReactDvwCommand(
      "Comando",
      `Punteggio ${parsed.scoreOur}-${parsed.scoreOpp}.`,
    );
  }
  if (parsed && parsed.kind === "rotation")
    return buildReactDvwCommand("Comando", "Rotazione.");
  if (parsed && parsed.kind === "lineup")
    return buildReactDvwCommand("Comando", "Lineup.");
  if (parsed && parsed.kind === "set-end")
    return buildReactDvwCommand("Comando", "Fine set.");
  const upper = raw.toUpperCase();
  let idx = 0;
  let team = "";
  let player = "";
  let skill = "";
  let type = "";
  let evaluation = "";
  if (upper[idx] === "*" || upper[idx] === "A") {
    team = upper[idx] === "*" ? "Team H" : "Team V";
    idx += 1;
  }
  while (idx < upper.length && /\d/.test(upper[idx]) && player.length < 2) {
    player += upper[idx];
    idx += 1;
  }
  if (idx < upper.length && /[SRABDEF]/.test(upper[idx])) {
    skill = upper[idx];
    idx += 1;
  }
  if (idx < upper.length && /[HMQTUNO]/.test(upper[idx])) {
    type = upper[idx];
    idx += 1;
  }
  if (idx < upper.length && /[#=!+\-/]/.test(upper[idx])) {
    evaluation = upper[idx];
    idx += 1;
  }
  const tail = upper.slice(idx);
  const suggestion = buildReactDvwSuggestion(normalized);
  const main = buildReactDvwGroup(
    "Main code",
    "scout-dvw-breakdown__group--main",
    [
      { label: "Team", value: team.replace("Team ", "") || "" },
      { label: "N", value: player || "" },
      { label: "Skill", value: skill ? getDvwScoutSkillLabel(skill) : "" },
      {
        label: "Type",
        value: type ? `${type} · ${getDvwScoutTypeLabel(type, skill)}` : "",
      },
      {
        label: "Val",
        value: evaluation ? getDvwScoutEvalLabel(evaluation) : "",
      },
    ],
  );
  const advanced = buildReactDvwGroup(
    "Advanced / Tail",
    "scout-dvw-breakdown__group--advanced",
    [{ label: "Tail", value: tail || "" }],
    { placeholder: !tail },
  );
  return { suggestion, groups: [main, advanced] };
}

export function publishReactDvwEntry() {
  const text = dvwEntryStore.getSnapshot().text,
    draft = text.trim(),
    expanded = draft ? expandDvwCompoundToken(draft) : null;
  const previews = !draft
    ? []
    : (expanded?.length ? expanded : [draft]).map((raw, index) => {
        const normalized = normalizeDvwScoutToken(raw);
        return {
          id: "draft-" + index,
          text: normalized.normalized || draft,
          draft: true,
          invalid: !normalized.parsed || normalized.parsed.kind === "unknown",
          skillClass: getDvwScoutChipSkillClass(normalized.parsed),
          compound: !!expanded && index === 0,
        };
      });
  dvwEntryStore.publish({
    text,
    breakdown: buildReactDvwBreakdown(draft),
    tokens: [
      ...teamManagementState.dvwScoutPendingTokens.map((entry) => ({
        id: entry.id,
        text: entry.text,
        skillClass: getDvwScoutChipSkillClass(entry.parsed),
      })),
      ...previews,
    ],
  });
}

export function changeReactDvwText(text) {
  dvwEntryStore.publish({ text });
  publishReactDvwEntry();
}

export function clearReactDvwEntry() {
  teamManagementState.dvwScoutPendingTokens = [];
  if (teamManagementState.elDvwScoutInput) {
    dvwEntryStore.publish({ text: "" });
    teamManagementState.elDvwScoutInput.focus();
  }
  renderDvwScoutPending();
  setDvwScoutStatus("Pronto.");
}

export function removeReactDvwToken(id) {
  teamManagementState.dvwScoutPendingTokens = teamManagementState.dvwScoutPendingTokens.filter(
    (token) => token.id !== id,
  );
  renderDvwScoutPending();
  setDvwScoutStatus("Token rimosso.");
  teamManagementState.elDvwScoutInput?.focus();
}
