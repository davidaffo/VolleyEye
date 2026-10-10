import { useSyncExternalStore } from "react";
import { runtimeStore } from "../state/runtime-store.mjs";
import { invokeRuntime } from "../compat/runtime.js";

function useRuntimeView() {
  return useSyncExternalStore(
    runtimeStore.subscribe,
    runtimeStore.getSnapshot,
    runtimeStore.getSnapshot,
  );
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
      data-react-managed="true"
      className={base + (active ? " active" : "")}
      {...props}
      onClick={() =>
        invokeRuntime("navigateToTab", target).catch(reportActionError)
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
    await invokeRuntime("applyTheme", choice);
    await invokeRuntime("saveState");
  };
  return (
    <button
      data-react-managed="true"
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
      data-react-managed="true"
      onClick={() =>
        invokeRuntime("setActiveAggTab", target).catch(reportActionError)
      }
    >
      {children}
    </button>
  );
}
