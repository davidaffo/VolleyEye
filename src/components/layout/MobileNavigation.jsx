import { useEffect, useRef, useState } from "react";
import { ScoutDrawerButton } from "../AppActions.jsx";
import { MobileToolbarButton } from "../ui/MobileToolbarButton.jsx";
import { MatchActionButton } from "../MatchArchive.jsx";
import { NavigationLinks } from "./NavigationLinks.jsx";

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    if (!open) return;
    const outside = event => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const escape = event => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("click", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div className="scout-mobile-bar" ref={root}>
      <MobileToolbarButton
        ref={trigger}
        id="btn-open-navigation-mobile"
        type="button"
        aria-label="Navigazione"
        title="Navigazione"
        aria-controls="mobile-navigation"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
        </svg>
      </MobileToolbarButton>
      <nav
        id="mobile-navigation"
        hidden={!open}
        onClick={event => {
          if (event.target.closest("button")) setOpen(false);
        }}
        className="mobile-navigation__options"
        aria-label="Navigazione pagine"
      >
        <NavigationLinks mobile />
        <MatchActionButton
          command="editMatch"
          className="secondary mobile-match-edit match-session-only"
          type="button"
          data-edit-match=""
        >
          Modifica dati partita
        </MatchActionButton>
        <MatchActionButton command="exportMatchFromNavigation" className="secondary mobile-match-export match-session-only" type="button" data-export-match="">Esporta partita</MatchActionButton>
        <MatchActionButton
          command="exitCurrentMatch"
          className="mobile-match-exit match-session-only"
          type="button"
          data-exit-match=""
          aria-label="Esci dalla partita"
          title="Esci dalla partita"
        >
          {"Esci dalla partita"}
        </MatchActionButton>
      </nav>
      <div className="mobile-scout-tools" onClick={() => setOpen(false)}>
        <ScoutDrawerButton
          as={MobileToolbarButton}
          drawer="menu"
          id="btn-open-menu-mobile"
          className="secondary small"
          type="button"
          aria-label="Impostazioni"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8.75a3.25 3.25 0 1 0 0 6.5a3.25 3.25 0 0 0 0-6.5ZM4.7 9.9l-1.65-1a1 1 0 0 1-.36-1.37l1.4-2.42a1 1 0 0 1 1.34-.4l1.8.78a7.7 7.7 0 0 1 1.64-.95l.28-1.94A1 1 0 0 1 9.15 1h2.7a1 1 0 0 1 .99.86l.28 1.94c.58.23 1.12.54 1.64.95l1.8-.78a1 1 0 0 1 1.34.4l1.4 2.42a1 1 0 0 1-.36 1.37l-1.65 1c.08.52.12 1.05.12 1.6s-.04 1.08-.12 1.6l1.65 1a1 1 0 0 1 .36 1.37l-1.4 2.42a1 1 0 0 1-1.34.4l-1.8-.78a7.7 7.7 0 0 1-1.64.95l-.28 1.94a1 1 0 0 1-.99.86h-2.7a1 1 0 0 1-.99-.86l-.28-1.94a7.7 7.7 0 0 1-1.64-.95l-1.8.78a1 1 0 0 1-1.34-.4l-1.4-2.42a1 1 0 0 1 .36-1.37l1.65-1a9.9 9.9 0 0 1-.12-1.6c0-.55.04-1.08.12-1.6Z"></path>
          </svg>
        </ScoutDrawerButton>
        <ScoutDrawerButton
          as={MobileToolbarButton}
          drawer="log"
          id="btn-open-log-mobile"
          className="secondary small"
          type="button"
        >
          {"Log"}
        </ScoutDrawerButton>
      </div>
    </div>
  );
}
