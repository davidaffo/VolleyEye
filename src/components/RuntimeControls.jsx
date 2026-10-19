
import { useViewStore } from "../hooks/useViewStore.js";

import { runtimeStore } from "../state/runtime-store.mjs";
import { actions as appActions } from "../app/actions.mjs";

function useRuntimeView() {
  return useViewStore(runtimeStore);
}

function reportActionError(error) {
  console.error("Operazione VolleyEye non riuscita", error);
  window.alert(error.message);
}

export function TabButton({ className, children, ...props }) {
  const snapshot = useRuntimeView();
  const target = props["data-tab-target"];
  const active = (snapshot.activeTab || "match") === target;
  const base = className
    .split(/\s+/)
    .filter((name) => name !== "active")
    .join(" ");
  return (
    <button
      className={base + (active ? " active" : "")}
      {...props}
      onClick={() =>
        appActions.navigateToTab(target).catch(reportActionError)
      }
    >
      {children}
    </button>
  );
}

export function ThemeButton({ className, children, ...props }) {
  const snapshot = useRuntimeView();
  const choice = props["data-theme-choice"];
  const active = snapshot.theme === choice;
  const choose = async () => {
    await appActions.applyTheme(choice);
    await appActions.saveState();
  };
  return (
    <button
      {...props}
      className={className + (active ? " active" : "")}
      aria-pressed={active}
      onClick={() => choose().catch(reportActionError)}
    >
      {children}
    </button>
  );
}

export function LiveScoreValue() {
  const snapshot = useRuntimeView();
  return snapshot.scoreLabel || "0 - 0";
}

export function AggTabButton({ className, children, ...props }) {
  const view = useRuntimeView(),
    target = props["data-agg-tab-target"],
    active = (view.activeAggTab || "summary") === target,
    base = className
      .split(/\s+/)
      .filter((name) => name !== "active")
      .join(" ");
  return (
    <button
      {...props}
      className={base + (active ? " active" : "")}
      onClick={() =>
        appActions.setActiveAggTab(target).catch(reportActionError)
      }
    >
      {children}
    </button>
  );
}
