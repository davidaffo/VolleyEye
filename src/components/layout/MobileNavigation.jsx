import { MatchActionButton } from "../MatchArchive.jsx";
import { NavigationLinks } from "./NavigationLinks.jsx";

export function MobileNavigation() {
  return (
    <details className="tabs-dots mobile-navigation" id="mobile-navigation">
      <summary>{"☰ Naviga"}</summary>
      <nav
        className="mobile-navigation__options"
        aria-label="Navigazione pagine"
      >
        <NavigationLinks mobile />
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
    </details>
  );
}
