import { createPreviousSkillOptions } from "../../domain/previous-skill-options.js";
import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"DEFAULT_SET_TYPE_OPTIONS": () => ([
  { value: "mezza", label: "Mezza" },
  { value: "super", label: "Super" },
  { value: "quick", label: "Quick" },
  { value: "veloce", label: "Veloce" },
  { value: "fast", label: "Fast" },
  { value: "alta", label: "Alta" }
]),
"SET_TYPE_SHORTCUTS": () => ({
  mezza: "M",
  super: "S",
  quick: "Q",
  veloce: "V",
  fast: "F",
  alta: "H",
  damp: "D"
}),
"DEFAULT_BASE_OPTIONS": () => ([
  { value: "K1", label: "K1" },
  { value: "K2", label: "K2" },
  { value: "KC", label: "KC" },
  { value: "KB", label: "KB" },
  { value: "K7", label: "K7" },
  { value: "KF", label: "KF" }
]),
"DEFAULT_PHASE_OPTIONS": () => ([
  { value: "so", label: "Side-out (SO)" },
  { value: "bp", label: "Break point (BP)" }
]),
"PREVIOUS_SKILL_OPTIONS": () => (createPreviousSkillOptions())
});
const liveScoreAndSetState = session;
