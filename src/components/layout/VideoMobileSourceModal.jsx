import { useSyncExternalStore } from "react";
import { mobileVideoSourceStore } from "../../state/roster-import-store.mjs";
import { invokeRuntime, invokeRuntimeEvent } from "../../compat/runtime.js";
// The compatibility engine owns dynamic descendants until their renderer is migrated.
export function VideoMobileSourceModal() {
  const view = useSyncExternalStore(
      mobileVideoSourceStore.subscribe,
      mobileVideoSourceStore.getSnapshot,
      mobileVideoSourceStore.getSnapshot,
    ),
    run = (command, ...args) =>
      invokeRuntime(command, ...args).catch(console.error),
    close = () => run("closeVideoMobileSourceModal"),
    load = () => run("loadReactMobileYoutube");
  return (
    <div
      id={"video-mobile-source-modal"}
      className={
        "skill-modal video-mobile-source-modal" + (view.open ? "" : " hidden")
      }
      data-react-managed="true"
      role={"dialog"}
      aria-modal={"true"}
      aria-labelledby={"video-mobile-source-title"}
    >
      <div
        id={"video-mobile-source-backdrop"}
        className={"skill-modal__backdrop"}
        onClick={close}
        data-react-managed="true"
      ></div>
      <div className={"skill-modal__content video-mobile-source-dialog"}>
        <button
          id={"video-mobile-source-close"}
          onClick={close}
          data-react-managed="true"
          className={"skill-modal__close-abs"}
          type={"button"}
          aria-label={"Chiudi"}
        >
          {"✕"}
        </button>
        <div className={"skill-modal__head"}>
          <h3 id={"video-mobile-source-title"}>{"Scegli il video"}</h3>
        </div>
        <div className={"skill-modal__body video-mobile-source-body"}>
          <p className={"section-note"}>
            {
              "Carica un video dal telefono oppure incolla il link YouTube della partita."
            }
          </p>
          <button
            id={"video-mobile-file-picker"}
            onClick={() => invokeRuntimeEvent("openReactLocalVideoPicker")}
            data-react-managed="true"
            className={"primary video-mobile-source-file"}
            type={"button"}
          >
            {"Carica dal telefono"}
          </button>
          <div className={"video-mobile-source-divider"}>
            <span>{"oppure"}</span>
          </div>
          <label htmlFor={"video-mobile-youtube-url"}>{"Link YouTube"}</label>
          <input
            id={"video-mobile-youtube-url"}
            data-react-managed="true"
            value={view.url}
            onChange={(event) =>
              mobileVideoSourceStore.publish({ url: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                load();
              }
            }}
            type={"url"}
            inputMode={"url"}
            placeholder={"https://youtu.be/..."}
            autoComplete={"url"}
          />
          <button
            id={"video-mobile-youtube-load"}
            onClick={load}
            data-react-managed="true"
            className={"secondary"}
            type={"button"}
          >
            {"Usa questo link"}
          </button>
          <button
            id={"video-mobile-source-later"}
            onClick={close}
            data-react-managed="true"
            className={"video-mobile-source-later"}
            type={"button"}
          >
            {"Continua senza video"}
          </button>
        </div>
      </div>
    </div>
  );
}
