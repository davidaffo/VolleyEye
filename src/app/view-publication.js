import { subscribeDomainEvents } from '../domain/events.js';
import { updateMatchButtonsState } from '../features/teams/settings/scouting-config.js';
import { renderMatchesSelect } from '../features/teams/storage/match-repository.js';
import { publishRuntimeView } from '../features/core/runtime-view.js';
import { publishReactSettings } from '../features/settings/view.js';
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
