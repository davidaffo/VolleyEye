import { useEffect, useSyncExternalStore } from "react";
import { trajectoryModalStore } from "../../state/roster-import-store.mjs";
import { invokeRuntime, invokeRuntimeEvent } from "../../compat/runtime.js";
const run = (command, ...args) =>
  invokeRuntime(command, ...args).catch(console.error);
export function AttackTrajectoryModal() {
  const view = useSyncExternalStore(
      trajectoryModalStore.subscribe,
      trajectoryModalStore.getSnapshot,
      trajectoryModalStore.getSnapshot,
    ),
    close = () => run("closeAttackTrajectoryModal", null),
    pointer = (kind, event) =>
      invokeRuntimeEvent(
        "handleReactTrajectoryPointer",
        kind,
        event.nativeEvent || event,
      );
  useEffect(() => {
    if (!view.open) return;
    const up = (event) => pointer("up", event);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [view.open]);
  const cancel = (event) => {
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
  };
  return (
    <div
      id="attack-trajectory-modal"
      className={view.className}
      data-react-managed="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attack-trajectory-title"
    >
      <div
        className="skill-modal__backdrop"
        data-close-trajectory=""
        onClick={close}
      />
      <div className="skill-modal__content attack-trajectory-content">
        <div className="attack-trajectory-body">
          <div className="attack-trajectory-stage">
            <img
              id="attack-trajectory-image"
              alt="Campo per traiettoria"
              src={view.source || undefined}
              data-react-managed="true"
              onLoad={() => invokeRuntimeEvent("resizeTrajectoryCanvas")}
            />
            <canvas
              id="attack-trajectory-canvas"
              data-react-managed="true"
              onPointerDown={(event) => pointer("down", event)}
              onPointerMove={(event) => pointer("move", event)}
              onClick={cancel}
              onContextMenu={cancel}
            />
          </div>
          <div
            id="attack-trajectory-netpoints"
            className={
              "attack-trajectory-netpoints" + (view.showNet ? "" : " hidden")
            }
            data-react-managed="true"
            aria-label="Punti rete attacco"
          >
            <span className="attack-trajectory-netpoints-label">
              Punto rete
            </span>
            {[
              { id: "5", x: "0.1667" },
              { id: "7-9", x: "0.3333" },
              { id: "3", x: "0.5" },
              { id: "4", x: "0.6667" },
              { id: "6-F", x: "0.8333" },
            ].map((point) => (
              <button
                key={point.id}
                type="button"
                data-react-managed="true"
                data-net-point={point.id}
                style={{ "--net-x": point.x }}
                className={view.netPoint === point.id ? "active" : undefined}
                onClick={() => run("chooseReactTrajectoryNetPoint", point.id)}
              >
                {point.id}
              </button>
            ))}
          </div>
        </div>
        <div className="attack-trajectory-actions">
          <div className="attack-trajectory-info">
            <div
              id="attack-trajectory-instructions"
              className={
                "attack-trajectory-instructions" +
                (!view.instructions ? " hidden" : "")
              }
              data-react-managed="true"
            >
              {view.instructions}
            </div>
            <div
              id="serve-type-buttons"
              className={
                "serve-type-buttons" + (view.showServe ? "" : " hidden")
              }
              data-react-managed="true"
              role="group"
              aria-label="Tipo battuta"
            >
              {[
                { id: "F", label: "Float (F)" },
                { id: "JF", label: "Jump float (JF)" },
                { id: "S", label: "Spin (S)" },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  data-react-managed="true"
                  data-serve-type={type.id}
                  className={view.serveType === type.id ? "active" : undefined}
                  onClick={() => run("setServeTypeSelection", type.id)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <button
            id="attack-trajectory-close-btn"
            className="pill-remove"
            type="button"
            data-react-managed="true"
            aria-label="Chiudi"
            onClick={close}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
