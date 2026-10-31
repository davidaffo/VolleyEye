import { subscribeDomainEvents } from "../domain/events.js";
import { updateMatchButtonsState, publishRuntimeView } from "../features/core/runtime-view.js";
import { renderMatchesSelect } from "../features/core/app-lifecycle.js";
import { publishReactSettings } from "../features/settings/view.js";
import { publishReactVideoView } from "../features/video/source-view.js";

export function publishApplicationViews() {
  publishRuntimeView();
  publishReactSettings();
  publishReactVideoView();
}

let unsubscribe;
export function observeDomainChanges() {
  unsubscribe ||= subscribeDomainEvents(type => {
    if (type === 'match-archive-changed') {
      updateMatchButtonsState();
      renderMatchesSelect();
    }
  });
}

export function stopViewPublications() {
  unsubscribe?.();
  unsubscribe = undefined;
}
