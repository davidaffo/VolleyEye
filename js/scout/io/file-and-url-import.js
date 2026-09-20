function handleImportMatchFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const txt = (e.target && e.target.result) || "";
      let parsed = null;
      let nextState = null;
      let importedBaseName = "Match importato";
      if (/^\s*\[3DATAVOLLEYSCOUT\]/i.test(txt)) {
        nextState = parseDataVolleyDvwToMatchState(txt);
        importedBaseName =
          (typeof buildMatchDisplayName === "function" ? buildMatchDisplayName((nextState && nextState.match) || {}) : "") ||
          `${(nextState.match && nextState.match.teamName) || "Squadra"} - ${(nextState.match && nextState.match.opponent) || "Match"}`;
      } else {
        parsed = JSON.parse(txt);
        nextState = parsed && parsed.state ? parsed.state : parsed;
        importedBaseName =
          (parsed && typeof parsed.name === "string" && parsed.name.trim()) ||
          (typeof buildMatchDisplayName === "function" ? buildMatchDisplayName((nextState && nextState.match) || {}) : "") ||
          "Match importato";
      }
      importMatchStateAsNew(nextState, { baseName: importedBaseName });
    } catch (err) {
      console.error("Import match error", err);
      alert("Errore durante l'import del match.");
    } finally {
      if (elMatchFileInput) elMatchFileInput.value = "";
    }
  };
  reader.readAsText(file);
}
function readMatchLinkParam() {
  if (typeof window === "undefined") return "";
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("match")) {
      return url.searchParams.get("match") || "";
    }
    const hash = (url.hash || "").replace(/^#/, "");
    if (hash.startsWith("match=")) {
      return hash.slice("match=".length);
    }
    const idx = hash.indexOf("match=");
    if (idx !== -1) {
      return hash.slice(idx + "match=".length);
    }
    return "";
  } catch (err) {
    logError("read-match-link", err);
    return "";
  }
}
function clearMatchLinkParam() {
  if (typeof window === "undefined" || !window.history || !window.location) return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("match");
    if (url.hash && url.hash.includes("match=")) {
      url.hash = "";
    }
    const next = url.pathname + url.search + url.hash;
    window.history.replaceState({}, document.title, next);
  } catch (err) {
    logError("clear-match-link", err);
  }
}
function maybeImportMatchFromUrl() {
  const encoded = readMatchLinkParam();
  if (!encoded) return { imported: false };
  const parsed = decodePayloadFromLink(encoded);
  if (!parsed) {
    alert("Link partita non valido o corrotto.");
    clearMatchLinkParam();
    return { imported: false };
  }
  const nextState = parsed.state || parsed;
  const importedBaseName =
    (parsed && typeof parsed.name === "string" && parsed.name.trim()) ||
    (typeof buildMatchDisplayName === "function" ? buildMatchDisplayName((nextState && nextState.match) || {}) : "") ||
    "Match importato";
  const result = importMatchStateAsNew(nextState, { baseName: importedBaseName, silent: true });
  clearMatchLinkParam();
  return { imported: !!(result && result.ok), name: (result && result.name) || state.selectedMatch };
}
function exportDatabaseToFile() {
  const payload = buildDatabaseBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const now = new Date();
  const pad2 = num => String(num).padStart(2, "0");
  const stamp =
    now.getFullYear() +
    ":" +
    pad2(now.getMonth() + 1) +
    ":" +
    pad2(now.getDate()) +
    "-" +
    pad2(now.getHours()) +
    ":" +
    pad2(now.getMinutes());
  downloadBlob(blob, "backup_" + stamp + ".json");
}
function handleImportDatabaseFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const txt = (e.target && e.target.result) || "";
      const parsed = JSON.parse(txt);
      if (parsed && ["volleyeye", "simple-volley-scout"].includes(parsed.app) && parsed.state) {
        applyImportedDatabase(parsed);
      } else {
        applyImportedDatabase({ state: parsed });
      }
    } catch (err) {
      console.error("Import database error", err);
      alert("Errore durante l'import del database.");
    } finally {
      if (elDbFileInput) elDbFileInput.value = "";
    }
  };
  reader.readAsText(file);
}
async function fetchJsonFromUrl(url) {
  const cleanUrl = (url || "").trim();
  if (!cleanUrl) throw new Error("URL mancante");
  let parsedUrl;
  try {
    parsedUrl = new URL(cleanUrl);
  } catch (err) {
    throw new Error("URL non valido");
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Protocollo URL non supportato");
  }
  const candidates = buildImportUrlCandidates(parsedUrl);
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: "GET",
        mode: "cors",
        redirect: "follow",
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error("Download fallito (" + response.status + ")");
      }
      const text = await response.text();
      return JSON.parse(text);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Download fallito");
}
function addImportUrlCandidate(list, seen, value) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return;
    const key = url.toString();
    if (seen.has(key)) return;
    seen.add(key);
    list.push(key);
  } catch (_) {
    // ignore invalid candidate
  }
}
function buildImportUrlCandidates(parsedUrl) {
  const candidates = [];
  const seen = new Set();
  addImportUrlCandidate(candidates, seen, parsedUrl.toString());

  const host = parsedUrl.hostname.toLowerCase();
  const path = parsedUrl.pathname || "";
  const genericDownload = new URL(parsedUrl.toString());
  let changedGeneric = false;
  ["download", "dl"].forEach(key => {
    if (genericDownload.searchParams.has(key) && genericDownload.searchParams.get(key) !== "1") {
      genericDownload.searchParams.set(key, "1");
      changedGeneric = true;
    }
  });
  if (changedGeneric) {
    addImportUrlCandidate(candidates, seen, genericDownload.toString());
  }

  if (host === "github.com" && path.includes("/blob/")) {
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 5) {
      const [owner, repo, , branch, ...fileParts] = parts;
      addImportUrlCandidate(
        candidates,
        seen,
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fileParts.join("/")}`
      );
    }
  }

  if ((host === "gitlab.com" || host.endsWith(".gitlab.com")) && path.includes("/-/blob/")) {
    const rawUrl = new URL(parsedUrl.toString());
    rawUrl.pathname = rawUrl.pathname.replace("/-/blob/", "/-/raw/");
    addImportUrlCandidate(candidates, seen, rawUrl.toString());
  }

  if (host === "www.dropbox.com" || host === "dropbox.com") {
    const direct = new URL(parsedUrl.toString());
    direct.hostname = "dl.dropboxusercontent.com";
    direct.searchParams.delete("dl");
    direct.searchParams.delete("raw");
    addImportUrlCandidate(candidates, seen, direct.toString());
    const dl = new URL(parsedUrl.toString());
    dl.searchParams.set("dl", "1");
    addImportUrlCandidate(candidates, seen, dl.toString());
  }

  const driveId =
    host === "drive.google.com"
      ? (path.match(/\/file\/d\/([^/]+)/) || [])[1] || parsedUrl.searchParams.get("id")
      : "";
  if (driveId) {
    addImportUrlCandidate(
      candidates,
      seen,
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveId)}`
    );
  }

  if (host.endsWith("1drv.ms") || host.includes("sharepoint.com")) {
    const download = new URL(parsedUrl.toString());
    download.searchParams.set("download", "1");
    addImportUrlCandidate(candidates, seen, download.toString());
  }

  return candidates;
}
async function importDatabaseFromUrl(url) {
  try {
    const parsed = await fetchJsonFromUrl(url);
    let imported = false;
    if (parsed && ["volleyeye", "simple-volley-scout"].includes(parsed.app) && parsed.state) {
      imported = applyImportedDatabase(parsed);
    } else {
      imported = applyImportedDatabase({ state: parsed });
    }
    if (imported && elImportDbUrl) elImportDbUrl.value = "";
  } catch (err) {
    console.error("Import database URL error", err);
    alert(
      "Errore import URL database. Verifica che il link sia pubblico e che il provider consenta il download via browser/CORS."
    );
  }
}
