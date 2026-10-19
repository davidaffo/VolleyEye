import { createFilterSelections } from "../../domain/filter-selections.js";
import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"trajectoryFilterState": () => (createFilterSelections(["setters","players","sets","codes","attackTypes","zones","setTypes","bases","phases","receiveEvaluations","receiveZones"], { previousSkill: true })),
"analysisTeamFilterState": () => (createFilterSelections(["teams"])),
"analysisSummaryFilterState": () => (createFilterSelections(["sets"])),
"serveTrajectoryFilterState": () => (createFilterSelections(["players","sets","codes","zones","setTypes","bases","phases","receiveEvaluations","receiveZones"])),
"playerTrajectoryFilterState": () => (createFilterSelections(["sets","codes","attackTypes","zones","setTypes","bases","phases","receiveEvaluations","receiveZones"], { previousSkill: true })),
"playerServeTrajectoryFilterState": () => (createFilterSelections(["sets","codes","zones","setTypes","bases","phases","receiveEvaluations","receiveZones"])),
"secondFilterState": () => (createFilterSelections(["setters","players","codes","zones","setTypes","bases","phases","receiveEvaluations","receiveZones","sets"], { previousSkill: true })),
"playerSecondFilterState": () => (createFilterSelections(["setTypes","bases","phases","receiveEvaluations","receiveZones","sets"], { previousSkill: true })),
"videoFilterState": () => (createFilterSelections(["teams","players","setters","skills","codes","sets","rotations","zones","bases","setTypes","phases","receiveEvaluations","receiveZones","serveTypes","attackTypes"], { previousSkill: true })),
"activeVideoFilterPresetId": () => (null),
"TRAJECTORY_BG_BY_ZONE": () => ({
  1: "images/trajectory/attack_2_near.png",
  2: "images/trajectory/attack_2_near.png",
  3: "images/trajectory/attack_3_near.png",
  4: "images/trajectory/attack_4_near.png",
  5: "images/trajectory/attack_4_near.png",
  6: "images/trajectory/attack_3_near.png"
}),
"TRAJECTORY_LINE_COLORS": () => ({
  "#": "#16a34a", // verde: punto pieno
  "+": "#2563eb", // blu
  "!": "#2563eb", // blu
  "-": "#f97316", // arancione deciso
  "=": "#dc2626", // rosso
  "/": "#dc2626" // rosso
}),
"TRAJECTORY_LINE_COLORS_SERVE": () => ({
  ...analysisFiltersState.TRAJECTORY_LINE_COLORS,
  "/": "#2563eb" // battuta: slash blu
}),
"TRAJECTORY_LINE_WIDTH": () => (3),
"trajectoryBgCache": () => ({}),
"serveTrajectoryImgs": () => (null),
"multiscoutTeamScope": () => ("our")
});
const analysisFiltersState = session;
