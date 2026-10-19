import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"THEME_PREFERENCE_KEY": () => ("volleyeye-theme-preference"),
"SKILL_COLUMN_MAP": () => ({
  serve: [4, 5, 6, 7, 8],
  pass: [9, 10, 11, 12, 13],
  attack: [14, 15, 16, 17, 18, 19],
  block: [20, 21],
  defense: [22, 23, 24],
  second: []
})
});
const stateStoreState = session;
