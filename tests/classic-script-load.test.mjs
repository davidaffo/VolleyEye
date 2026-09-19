import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { ROSTER_SOURCE_FILES } from "./helpers/roster-source.mjs";
import { SCOUT_SOURCE_FILES } from "./helpers/scout-source.mjs";

const rootUrl = new URL("../", import.meta.url);
const runtimeFiles = [
  "js/globals.js",
  "js/shared/namespace.js",
  "js/shared/state-isolation.js",
  "js/shared/team-ui.js",
  "js/shared/lineup-core.js",
  "js/shared/auto-role.js",
  "js/shared/roster-manager.js",
  "js/match-settings.js",
  "js/opponent-settings.js",
  ...ROSTER_SOURCE_FILES.map(path => `js/${path}`),
  ...SCOUT_SOURCE_FILES.map(path => `js/${path}`)
];

function makeClassList() {
  return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
}

function buildBrowserContext() {
  const body = { dataset: {}, classList: makeClassList(), style: {} };
  const documentElement = { dataset: {}, style: { setProperty() {} } };
  const document = {
    body,
    documentElement,
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() {
      return {
        classList: makeClassList(),
        dataset: {},
        style: {},
        appendChild() {},
        addEventListener() {},
        setAttribute() {},
        querySelector() { return null; },
        querySelectorAll() { return []; }
      };
    }
  };
  const storage = {
    getItem(key) {
      return key === "volleyeye-default-demo-preference" ? "removed" : null;
    },
    setItem() {},
    removeItem() {},
    clear() {}
  };
  const context = {
    console,
    document,
    localStorage: storage,
    sessionStorage: storage,
    navigator: {},
    location: { hostname: "localhost", protocol: "http:", href: "http://localhost/" },
    history: { replaceState() {} },
    URL,
    URLSearchParams,
    Blob,
    TextEncoder,
    TextDecoder,
    structuredClone,
    setTimeout() { return 0; },
    clearTimeout() {},
    setInterval() { return 0; },
    clearInterval() {},
    requestAnimationFrame(callback) { return typeof callback === "function" ? 0 : 0; },
    cancelAnimationFrame() {},
    matchMedia() { return { matches: false, addEventListener() {}, removeEventListener() {} }; },
    addEventListener() {},
    removeEventListener() {}
  };
  context.window = context;
  context.self = context;
  return vm.createContext(context);
}

test("gli script modulari condividono lo stesso contesto classico senza collisioni", async () => {
  const context = buildBrowserContext();
  runtimeFiles.forEach(path => {
    const source = readFileSync(new URL(path, rootUrl), "utf8");
    assert.doesNotThrow(
      () => vm.runInContext(source, context, { filename: path }),
      `caricamento fallito in ${path}`
    );
  });
  await assert.doesNotReject(
    Promise.resolve(vm.runInContext("init()", context)),
    "il bootstrap modulare deve completarsi senza dipendenze locali mancanti"
  );
});
