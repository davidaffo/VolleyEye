import { createDomainState } from "../../app/domain-state.mjs";

export const session = createDomainState({
"SCOUT_WIDGET_IDS": () => (["video", "dvw", "events", "serve-trajectories"]),
"SCOUT_WIDGET_ZONE_IDS": () => (["center-top", "center-bottom", "right"]),
"SCOUT_WIDGET_LABELS": () => ({
  video: "Video scout",
  dvw: "Codice DataVolley",
  events: "Tabella eventi",
  "serve-trajectories": "Traiettorie di battuta"
}),
"activeScoutWidgetDrag": () => (null)
});
const trajectoriesState = session;
