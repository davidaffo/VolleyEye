import { setAutoRotateEnabled } from "../teams/court/court-ui-bootstrap.js";
import { session as matchState } from "../../../js/globals.js";
import { updateDefaultDemoDeleteButtonVisibility } from "../io/match-io.js";

export function bindDataAndNavigationControls() {
  setAutoRotateEnabled(matchState.state.autoRotate !== false);
  if (matchState.elRotationIndicator && matchState.elRotationSelect) {
    const openSelect = () => {
      matchState.elRotationSelect.focus();
      matchState.elRotationSelect.click();
    };
    matchState.elRotationIndicator.addEventListener("click", openSelect);
    matchState.elRotationIndicator.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openSelect();
      }
    });
  }
  // elementi mobile rimossi

  updateDefaultDemoDeleteButtonVisibility();

  // pulsanti lineup mobile rimossi

  const closeDrawers = () => {
    document.body.classList.remove("drawer-menu-open", "drawer-log-open");
  };

}
