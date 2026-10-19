import { ModalFrame, ModalHeader, ModalBody, ModalCloseButton } from "../ui/Modal.jsx";
import { CommandButton } from "../ui/CommandButton.jsx";

import { useViewStore } from "../../hooks/useViewStore.js";

import { mobileVideoSourceStore } from "../../state/roster-import-store.mjs";
import { actions as appActions } from "../../app/actions.mjs";
export function VideoMobileSourceModal() {
  const view = useViewStore(mobileVideoSourceStore),
    run = (command, ...args) =>
      appActions[command]( ...args).catch(console.error),
    close = () => run("closeVideoMobileSourceModal"),
    load = () => run("loadReactMobileYoutube");
  return (
    <ModalFrame
      id="video-mobile-source-modal"
      className="skill-modal video-mobile-source-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-mobile-source-title"
      open={view.open}
      onClose={close}
      variant="skill"
      backdropProps={{
        id: "video-mobile-source-backdrop",
      }}
      contentProps={{
        className: "skill-modal__content video-mobile-source-dialog",
      }}
    >
      <ModalCloseButton
        id="video-mobile-source-close"
        onClick={close}
        className="skill-modal__close-abs"
        type="button"
        aria-label="Chiudi"
      >
        {"✕"}
      </ModalCloseButton>
      <ModalHeader variant="skill">
        <h3 id="video-mobile-source-title">{"Scegli il video"}</h3>
      </ModalHeader>
      <ModalBody
        variant="skill"
        className="skill-modal__body video-mobile-source-body"
      >
        <p className="section-note">
          {
            "Carica un video dal telefono oppure incolla il link YouTube della partita."
          }
        </p>
        <CommandButton
          id="video-mobile-file-picker"
          command="openReactLocalVideoPicker"
          immediate
          className="primary video-mobile-source-file"
          type="button"
        >
          {"Carica dal telefono"}
        </CommandButton>
        <div className="video-mobile-source-divider">
          <span>{"oppure"}</span>
        </div>
        <label htmlFor="video-mobile-youtube-url">{"Link YouTube"}</label>
        <input
          id="video-mobile-youtube-url"
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
          type="url"
          inputMode="url"
          placeholder="https://youtu.be/..."
          autoComplete="url"
        />
        <button
          id="video-mobile-youtube-load"
          onClick={load}
          className="secondary"
          type="button"
        >
          {"Usa questo link"}
        </button>
        <button
          id="video-mobile-source-later"
          onClick={close}
          className="video-mobile-source-later"
          type="button"
        >
          {"Continua senza video"}
        </button>
      </ModalBody>
    </ModalFrame>
  );
}
