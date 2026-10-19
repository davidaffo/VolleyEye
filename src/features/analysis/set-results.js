import { session as matchState } from '../../../js/globals.js';
export function computeSetWinScore() {
  const results = matchState.state.setResults || {};
  let totalFor = 0;
  let totalAgainst = 0;
  Object.keys(results).forEach(key => {
    const winner = results[key];
    if (winner === "our") totalFor += 1;
    if (winner === "opponent") totalAgainst += 1;
  });
  return { for: totalFor, against: totalAgainst };
}
