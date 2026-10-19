import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"MATCH_SHEET_ROLE_ORDER": () => (["P", "S1", "C2", "O", "S2", "C1"]),
"MATCH_SHEET_ROTATION_ORDER": () => ([1, 6, 5, 4, 3, 2]),
"MATCH_SHEET_DEFENSE_ZONES": () => ([4, 2, 3, 6, 1]),
"MATCH_SHEET_COURT_HEIGHT": () => (200),
"MATCH_SHEET_COURT_ZONES": () => ({
  1: { x: 82, y: 45 },
  2: { x: 82, y: 15 },
  3: { x: 50, y: 15 },
  4: { x: 18, y: 15 },
  5: { x: 18, y: 45 },
  6: { x: 50, y: 45 }
}),
"MATCH_SHEET_FAR_COURT_ZONES": () => ({
  1: { x: 18, y: 24 },
  2: { x: 18, y: 76 },
  3: { x: 50, y: 76 },
  4: { x: 82, y: 76 },
  5: { x: 82, y: 24 },
  6: { x: 50, y: 24 }
}),
"MATCH_SHEET_NEAR_COURT_ZONES": () => ({
  1: { x: 82, y: 176 },
  2: { x: 82, y: 124 },
  3: { x: 50, y: 124 },
  4: { x: 18, y: 124 },
  5: { x: 18, y: 176 },
  6: { x: 50, y: 176 }
})
});
const trajectoryRenderingState = session;
