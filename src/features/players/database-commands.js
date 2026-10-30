import {
  openPlayerPhotoEditor,
  preparePlayerPhotoDataUrl,
} from "./photo-editor.js";
import {
  PLAYER_PHOTO_REMOVE_RESULT,
  pickImageFile,
  logError,
} from "../../../js/globals.js";
import {
  mergePlayersDbEntries,
  renderPlayersDbList,
  updatePlayerPhotoInDbAndTeams,
} from "../live/team-management.js";

export async function mergeManagedPlayersDb(primaryId, secondaryId) {
  if (!primaryId || !secondaryId || primaryId === secondaryId) {
    alert("Seleziona due giocatrici diverse da unire.");
    return;
  }
  if (
    !confirm("Unire le due giocatrici selezionate mantenendo l'ID della prima?")
  )
    return;
  const merged = await mergePlayersDbEntries(primaryId, secondaryId);
  if (!merged) {
    alert("Unione non riuscita. Verifica che entrambe esistano nell'archivio.");
    return;
  }
  renderPlayersDbList();
  alert("Giocatrici unite. ID aggiornati nei match.");
}

export async function editPlayersDbPhoto(entry) {
  try {
    let photo = "";
    if (entry.photo) {
      const edited = await openPlayerPhotoEditor(entry.photo, {
        allowRemove: true,
      });
      if (edited === PLAYER_PHOTO_REMOVE_RESULT) {
        updatePlayerPhotoInDbAndTeams(entry.id, "");
        return;
      }
      photo = edited || "";
    } else {
      const file = await pickImageFile("image/*");
      if (!file) return;
      photo = await preparePlayerPhotoDataUrl(file);
    }
    if (photo) updatePlayerPhotoInDbAndTeams(entry.id, photo);
  } catch (error) {
    logError("Errore caricamento foto archivio giocatrici", error);
    alert("Immagine non valida o non caricabile.");
  }
}
