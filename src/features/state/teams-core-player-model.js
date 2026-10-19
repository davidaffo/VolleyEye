import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"SKILL_SHORT_LABELS": () => ({
  serve: "BA",
  pass: "RI",
  attack: "AT",
  defense: "DF",
  block: "MU",
  second: "AL",
  manual: "MN"
})
});
const playerModelState = session;
