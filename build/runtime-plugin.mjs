import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readCompatibilitySources } from "./compatibility-source.mjs";
import { runtimeFiles } from "../config/runtime-files.mjs";

const virtualId = "virtual:volleyeye-runtime";
export function runtimePlugin() {
  let root;
  return {
    name: "volleyeye-compatibility-runtime",
    configResolved(config) {
      root = config.root;
    },
    resolveId(id) {
      if (id === virtualId) return "\0" + virtualId;
    },
    load(id) {
      if (id !== "\0" + virtualId) return;
      const source = readCompatibilitySources(root, {
        watch: (path) => this.addWatchFile(path),
      });
      const stateFiles = [
        "runtime-store",
        "match-dialog-store",
        "teams-manager-store",
        "next-set-store",
        "attribution-store",
        "set-start-store",
        "lineup-store",
        "scout-court-store",
        "skill-modal-store",
        "team-editor-store",
        "attack-shortcut-store",
        "roster-import-store",
        "filter-store",
        "event-table-store",
        "analysis-chart-store",
        "analysis-table-store",
        "video-edit-store",
        "players-db-store",
      ];
      const imports = stateFiles
        .map((name) => {
          const path = resolve(root, "src/state/" + name + ".mjs");
          this.addWatchFile(path);
          const names = [
            ...readFileSync(path, "utf8").matchAll(
              /export const (\w+Store)\b/g,
            ),
          ].map((match) => match[1]);
          if (!names.length)
            throw new Error("No exported view store in " + path);
          return (
            "import { " +
            names.join(", ") +
            " } from " +
            JSON.stringify(path) +
            ";"
          );
        })
        .join("\n");
      const adapters = [
        "runtime-adapter.js",
        "filter-adapter.js",
        "match-sheet-adapter.js",
        "play-by-play-adapter.js",
        "set-trend-adapter.js",
        "aggregated-table-adapter.js",
        "second-analysis-adapter.js",
        "trajectory-adapter.js",
        "trajectory-modal-adapter.js",
        "player-analysis-adapter.js",
        "event-table-adapter.js",
        "analysis-chart-adapter.js",
        "court-adapter.js",
        "skill-modal-adapter.js",
        "team-editor-adapter.js",
        "players-db-adapter.js",
      ].map((name) => {
        const path = resolve(root, "src/compat/" + name);
        this.addWatchFile(path);
        return readFileSync(path, "utf8");
      });
      return [imports, source, ...adapters].join("\n");
    },
    handleHotUpdate(context) {
      // Existing listeners and DOM references need a fresh document on engine or shell edits.
      if (
        runtimeFiles.some((path) => resolve(root, path) === context.file) ||
        context.file.startsWith(resolve(root, "src/components/layout")) ||
        context.file === resolve(root, "src/components/AppLayout.jsx") ||
        context.file.startsWith(resolve(root, "src/compat/"))
      ) {
        context.server.ws.send({ type: "full-reload" });
        return [];
      }
    },
  };
}
