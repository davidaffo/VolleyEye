import { MatchActionButton } from "../MatchArchive.jsx";
import { TabButton } from "../RuntimeControls.jsx";

// The compatibility engine owns dynamic descendants until their renderer is migrated.
export function MobileNavigation() {
  return (
    <details className={"tabs-dots mobile-navigation"} id={"mobile-navigation"}>
      <summary>{"☰ Naviga"}</summary>
      <nav
        className={"mobile-navigation__options"}
        aria-label={"Navigazione pagine"}
      >
        <TabButton
          className={"tab-btn tab-dot lobby-only active"}
          data-tab-target={"match"}
          aria-label={"Partite"}
        >
          {"Partite"}
        </TabButton>
        <TabButton
          className={"tab-btn tab-dot match-session-only"}
          data-tab-target={"scout"}
          aria-label={"Scout live"}
        >
          {"Scout live"}
        </TabButton>
        <TabButton
          className={"tab-btn tab-dot match-session-only"}
          data-tab-target={"aggregated"}
          aria-label={"Analisi"}
        >
          {"Analisi"}
        </TabButton>
        <TabButton
          className={"tab-btn tab-dot match-session-only"}
          data-tab-target={"video"}
          aria-label={"Video"}
        >
          {"Video"}
        </TabButton>
        <TabButton
          className={"tab-btn tab-dot"}
          data-tab-target={"info"}
          aria-label={"Impostazioni"}
        >
          {"Impostazioni"}
        </TabButton>
        <MatchActionButton
          command="exitCurrentMatch"
          className={"mobile-match-exit match-session-only"}
          type={"button"}
          data-exit-match={""}
          aria-label={"Esci dalla partita"}
          title={"Esci dalla partita"}
        >
          {"Esci dalla partita"}
        </MatchActionButton>
      </nav>
    </details>
  );
}
