import { session as matchState } from '../../../js/globals.js';
import { buildMatchDisplayName } from './match-details.js';
export function getMatchArchiveLabel(name, payload, allNames = []) {
  const displayName =
    payload && payload.state && payload.state.match
      ? buildMatchDisplayName(payload.state.match)
      : name;
  const duplicateNames = allNames.filter(otherName => {
    const otherPayload = matchState.state.savedMatches && matchState.state.savedMatches[otherName];
    const otherDisplayName =
      otherPayload && otherPayload.state && otherPayload.state.match
        ? buildMatchDisplayName(otherPayload.state.match)
        : otherName;
    return otherDisplayName === displayName;
  });
  if (duplicateNames.length < 2) return displayName || name;
  return `${displayName || name} (${duplicateNames.indexOf(name) + 1})`;
}
