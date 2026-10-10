function publishPlayersDbView() {
  const usage = buildPlayersDbUsage(loadTeamsMapFromStorage());
  const entries = Object.values(state.playersDb || {}).filter(
    (entry) =>
      entry?.id &&
      !(
        typeof isTemplatePlayerName === "function" &&
        isTemplatePlayerName(entry.name)
      ),
  );
  entries.sort((a, b) => {
    const lastA = (a.lastName || "").trim(),
      lastB = (b.lastName || "").trim(),
      firstA = (a.firstName || "").trim(),
      firstB = (b.firstName || "").trim();
    if (lastA && lastB && lastA !== lastB)
      return lastA.localeCompare(lastB, "it", { sensitivity: "base" });
    if (firstA && firstB && firstA !== firstB)
      return firstA.localeCompare(firstB, "it", { sensitivity: "base" });
    return (a.name || "")
      .trim()
      .localeCompare((b.name || "").trim(), "it", { sensitivity: "base" });
  });
  const options = Object.freeze(
    buildPlayersDbOptions(entries).map((option) => Object.freeze(option)),
  );
  const orphans = entries.filter((entry) => !usage[entry.id]?.length).length;
  playersDbStore.publish({
    entries: Object.freeze(
      entries.map((entry) =>
        Object.freeze({
          id: entry.id,
          lastName: entry.lastName || "",
          firstName: entry.firstName || "",
          photo: entry.photo || "",
          teams: (usage[entry.id] || []).join(", ") || "—",
          onPhoto: () => editPlayersDbPhoto(entry),
        }),
      ),
    ),
    options,
    primaryId: options[0]?.id || "",
    secondaryId: options[1]?.id || options[0]?.id || "",
    countLabel:
      entries.length +
      " giocatrici" +
      (orphans ? " · " + orphans + " senza squadra" : ""),
  });
}
function setPlayersDbOpen(open) {
  playersDbStore.publish({ open });
}
async function mergeManagedPlayersDb(primaryId, secondaryId) {
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
async function editPlayersDbPhoto(entry) {
  try {
    let photo = "";
    if (entry.photo && typeof openPlayerPhotoEditor === "function") {
      const edited = await openPlayerPhotoEditor(entry.photo, {
        allowRemove: true,
      });
      if (edited === PLAYER_PHOTO_REMOVE_RESULT) {
        updatePlayerPhotoInDbAndTeams(entry.id, "");
        return;
      }
      photo = edited || "";
    } else {
      const file =
        typeof pickImageFile === "function"
          ? await pickImageFile("image/*")
          : null;
      if (!file) return;
      photo =
        typeof preparePlayerPhotoDataUrl === "function"
          ? await preparePlayerPhotoDataUrl(file)
          : "";
    }
    if (photo) updatePlayerPhotoInDbAndTeams(entry.id, photo);
  } catch (error) {
    logError("Errore caricamento foto archivio giocatrici", error);
    alert("Immagine non valida o non caricabile.");
  }
}
