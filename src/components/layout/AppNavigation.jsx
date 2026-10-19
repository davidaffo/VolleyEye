import { MatchActionButton, ActiveMatchName } from "../MatchArchive.jsx";
import { NavigationLinks } from "./NavigationLinks.jsx";

export function AppNavigation() {
  return (
    <div className="tabs-nav centered app-shell-nav">
      <h1 className="app-title">{"VolleyEye"}</h1>
      <a
        className="manual-link-btn hidden"
        href="docs/markdown-viewer.html?doc=manual.md&amp;title=Manuale"
        target="_blank"
        rel="noopener"
      >
        {"Manuale"}
      </a>
      <div
        className="match-session-identity match-session-only"
        aria-live="polite"
      >
        <span className="match-session-identity__label">{"Partita"}</span>
        <ActiveMatchName />
      </div>
      <NavigationLinks />
      <MatchActionButton
        command="editMatch"
        className="secondary match-session-only"
        type="button"
        data-edit-match=""
      >
        {"Modifica dati partita"}
      </MatchActionButton>
      <MatchActionButton
        command="exitCurrentMatch"
        id="btn-exit-match"
        className="secondary match-session-only match-session-exit"
        type="button"
        data-exit-match=""
      >
        {"Esci dalla partita"}
      </MatchActionButton>
    </div>
  );
}
