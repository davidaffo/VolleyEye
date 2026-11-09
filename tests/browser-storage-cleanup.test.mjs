import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { IDBFactory } from "fake-indexeddb";
import { STORAGE_KEY, MATCH_PREFIX, TEAM_PREFIX, OPPONENT_TEAM_PREFIX, PLAYER_PREFIX } from "../js/globals.js";
import { session as stateDbState } from "../src/features/state/storage-state-db.js";
import { session as videoState } from "../src/features/state/live-team-management.js";
import { session as themeState } from "../src/features/state/teams-core-state-store.js";
import { session as demoState } from "../src/features/state/io-match-io.js";
import { session as scoutState } from "../src/features/state/scout-ui.js";
import { featureSource } from "./helpers/feature-source.mjs";

const cleanupSource = featureSource("src/features/core/browser-storage-cleanup.js");
const lifecycleSource = featureSource("src/features/core/app-lifecycle.js", [
  "deleteIndexedDbByName", "deleteVolleyEyeIndexedDbDatabases", "forceRefreshAppAssets", "registerServiceWorker",
]);

function harness(href = "https://example.test/VolleyEye/?reset_app=1") {
  const saved = new Map();
  const cacheNames = new Set(["volleyeye-cache-react-old", "other-pwa-cache", "volleyeye-not-a-cache"]);
  const unregistered = [];
  const location = { href, ...Object.fromEntries(["hostname", "protocol"].map(key => [key, new URL(href)[key]])), replace() {} };
  const scope = new URL("./", href).href;
  const registrations = [scope, new URL("/OtherApp/", href).href, new URL("/", href).href]
    .filter((value, index, all) => all.indexOf(value) === index)
    .map(scope => ({ scope, async unregister() { unregistered.push(scope); } }));
  const storage = {
    get length() { return saved.size; },
    key(i) { return [...saved.keys()][i] ?? null; },
    getItem(key) { return saved.get(key) ?? null; },
    setItem(key, value) { saved.set(key, value); },
    removeItem(key) { saved.delete(key); },
  };
  const ctx = vm.createContext({
    URL, Promise, console, location,
    indexedDB: new IDBFactory(),
    localStorage: storage,
    sessionStorage: { removeItem() {}, getItem() { return null; } },
    navigator: { serviceWorker: { async getRegistrations() { return registrations; } } },
    caches: { async keys() { return [...cacheNames]; }, async delete(key) { return cacheNames.delete(key); } },
    document: { getElementById() { return null; } },
    updateBannerStore: { publish() {} },
    STORAGE_KEY, MATCH_PREFIX, TEAM_PREFIX, OPPONENT_TEAM_PREFIX, PLAYER_PREFIX,
    STATE_DB_NAME: stateDbState.STATE_DB_NAME,
    LOCAL_VIDEO_DB: videoState.LOCAL_VIDEO_DB,
    THEME_PREFERENCE_KEY: themeState.THEME_PREFERENCE_KEY,
    DEFAULT_DEMO_PREFERENCE_KEY: demoState.DEFAULT_DEMO_PREFERENCE_KEY,
    APP_RESET_SIGNAL_KEY: scoutState.APP_RESET_SIGNAL_KEY,
  });
  ctx.window = ctx;
  vm.runInContext(cleanupSource + "\n" + lifecycleSource, ctx);
  return { ctx, saved, cacheNames, unregistered, scope };
}

async function seedDatabase(indexedDB, name) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("data");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise((resolve, reject) => {
    const tx = db.transaction("data", "readwrite");
    tx.objectStore("data").put({ match: "dati da conservare" }, "saved");
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

test("il reset elimina solo i due database VolleyEye e conserva i dati di un'altra PWA", async () => {
  const { ctx } = harness();
  for (const name of [ctx.STATE_DB_NAME, ctx.LOCAL_VIDEO_DB, "other-pwa"]) await seedDatabase(ctx.indexedDB, name);
  await ctx.deleteVolleyEyeIndexedDbDatabases();
  assert.deepEqual((await ctx.indexedDB.databases()).map(db => db.name), ["other-pwa"]);
  const db = await new Promise(resolve => {
    const request = ctx.indexedDB.open("other-pwa");
    request.onsuccess = () => resolve(request.result);
  });
  const value = await new Promise(resolve => {
    db.transaction("data").objectStore("data").get("saved").onsuccess = event => resolve(event.target.result);
  });
  assert.deepEqual(value, { match: "dati da conservare" });
  db.close();
});

test("il reset locale conserva le chiavi estranee anche sotto Data/", () => {
  const { ctx, saved } = harness();
  const own = [STORAGE_KEY, STORAGE_KEY + ":archive-migration-v1", PLAYER_PREFIX,
    MATCH_PREFIX + "partita", TEAM_PREFIX + "squadra", OPPONENT_TEAM_PREFIX + "ospiti",
    ctx.THEME_PREFERENCE_KEY, ctx.DEFAULT_DEMO_PREFERENCE_KEY, ctx.APP_RESET_SIGNAL_KEY];
  const foreign = ["other-pwa", "Data/OtherApp/match", "volleyeye-other-app", PLAYER_PREFIX + "Other"];
  [...own, ...foreign].forEach(key => saved.set(key, "saved"));
  ctx.clearVolleyEyeLocalStorage();
  assert.deepEqual([...saved.keys()], foreign);
});

test("reset e aggiornamento preservano cache e service worker delle altre PWA", async () => {
  for (const href of ["https://example.test/VolleyEye/?reset_app=1", "https://example.test/VolleyEye/index.html", "https://volleyeye.davidaffo.com/?reset_app=1"]) {
    const { ctx, cacheNames, unregistered, scope } = harness(href);
    await ctx.forceRefreshAppAssets();
    assert.deepEqual(unregistered, [scope]);
    assert.deepEqual([...cacheNames], ["other-pwa-cache", "volleyeye-not-a-cache"]);
  }
});

test("l'avvio in sviluppo non rimuove gli asset di altre PWA su localhost", async () => {
  const { ctx, cacheNames, unregistered, scope } = harness("http://localhost:3000/");
  ctx.registerServiceWorker();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(unregistered, [scope]);
  assert.deepEqual([...cacheNames], ["other-pwa-cache", "volleyeye-not-a-cache"]);
});

test("la pulizia cache resta limitata a VolleyEye se il service worker non risponde", async () => {
  const { ctx, cacheNames } = harness();
  ctx.navigator.serviceWorker.getRegistrations = async () => { throw new Error("unavailable"); };
  await ctx.clearVolleyEyeAppAssets();
  assert.deepEqual([...cacheNames], ["other-pwa-cache", "volleyeye-not-a-cache"]);
});
