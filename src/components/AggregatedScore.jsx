import { useSyncExternalStore } from "react";
import { aggregatedScoreStore } from "../state/roster-import-store.mjs";
function useView() {
  return useSyncExternalStore(
    aggregatedScoreStore.subscribe,
    aggregatedScoreStore.getSnapshot,
    aggregatedScoreStore.getSnapshot,
  );
}
export function AggregatedTotalScore() {
  const view = useView();
  return (
    <div id="agg-score" className="score-value" data-react-managed="true">
      {view.label}
    </div>
  );
}
export function AggregatedSetCards() {
  const view = useView();
  return (
    <div
      id="agg-set-cards"
      className="score-sets cards"
      data-react-managed="true"
    >
      {view.sets.length ? (
        view.sets.map((set) => (
          <div key={set.key} className="score-set-chip">
            {set.label}
          </div>
        ))
      ) : (
        <div className="score-set-chip">Nessun set</div>
      )}
    </div>
  );
}
