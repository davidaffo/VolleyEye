import { session as scoutUiState } from "../state/scout-ui.js";
export function getTrajectoryImageForZone(zone, isFarSide) {
  if (!zone)
    return isFarSide
      ? scoutUiState.TRAJECTORY_IMG_FAR
      : scoutUiState.TRAJECTORY_IMG_NEAR;
  if (!isFarSide) {
    if (zone === 4 || zone === 3 || zone === 2) {
      return `images/trajectory/attack_${zone}_near.png`;
    }
    return scoutUiState.TRAJECTORY_IMG_NEAR;
  }
  if (zone === 4 || zone === 5) return "images/trajectory/attack_4_far.png";
  if (zone === 3 || zone === 6) return "images/trajectory/attack_3_far.png";
  if (zone === 2 || zone === 1) return "images/trajectory/attack_2_far.png";
  return scoutUiState.TRAJECTORY_IMG_FAR;
}
