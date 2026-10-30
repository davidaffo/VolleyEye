import { liberoBenchStore } from "../../state/roster-import-store.mjs";
import { scoutCourtStore } from "../../state/scout-court-store.mjs";
export function publishLiberoBench(view) {
  liberoBenchStore.publish(view);
}
export function publishScoutCourtView(scope, view) {
  scoutCourtStore.publish(scope, view);
}
