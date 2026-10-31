import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { buildAnalysisExport } from "./analysis-export.mjs";

export function staticAssetsPlugin() {
  let config;
  return {
    name: "volleyeye-static-assets",
    configResolved(value) {
      config = value;
    },
    transformIndexHtml: {
      order: "post",
      handler(html) {
        // Keep the manifest at the application root; its scope and icons are relative.
        return html.replace(
          /(<link rel="manifest" href=")[^"]+/,
          "$1" + config.base + "manifest.json",
        );
      },
    },
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split("?")[0] !== "/analysis-react.js") return next();
        try {
          response.setHeader("Content-Type", "text/javascript");
          response.end(await buildAnalysisExport(config.root));
        } catch (error) { next(error); }
      });
    },
    // post-order ensures Vite has emitted index.html and all lazy chunks before precaching.
    generateBundle: {
      order: "post",
      async handler(_, bundle) {
        const assets = [];
        const addAsset = (fileName, source) => {
          this.emitFile({ type: "asset", fileName, source });
          assets.push([fileName, source]);
        };
        const copyDirectory = (directory) => {
          for (const entry of readdirSync(resolve(config.root, directory), {
            withFileTypes: true,
          })) {
            if (entry.name.startsWith(".")) continue;
            const path = join(directory, entry.name).replaceAll("\\", "/");
            if (entry.isDirectory()) copyDirectory(path);
            else if (entry.isFile()) addAsset(path, readFileSync(resolve(config.root, path)));
          }
        };
        for (const directory of ["icons", "images", "docs"]) copyDirectory(directory);
        for (const path of [
          "manifest.json",
          "version.json",
          "match_demo.json",
          "js/vendor/marked.umd.js",
          "js/vendor/mediabunny-LICENSE.txt",
        ])
          addAsset(path, readFileSync(resolve(config.root, path)));
        addAsset(
          "analysis-react.js",
          await buildAnalysisExport(config.root),
        );
        const hash = createHash("sha256");
        for (const item of Object.values(bundle).sort((a, b) =>
          a.fileName.localeCompare(b.fileName),
        ))
          hash.update(item.fileName).update(item.type === "chunk" ? item.code : item.source);
        for (const [name, source] of assets.sort(([a], [b]) => a.localeCompare(b)))
          hash.update(name).update(source);
        const workerTemplate = readFileSync(resolve(config.root, "src/pwa/service-worker.js"), "utf8");
        hash.update(workerTemplate);
        const cacheName = "volleyeye-cache-react-" + hash.digest("hex").slice(0, 16);
        const paths = [
          ...new Set([
            "./",
            ...Object.keys(bundle).filter((path) => !path.endsWith(".map")),
            ...assets.map(([path]) => path),
          ]),
        ];
        const worker = workerTemplate
          .replace("__CACHE_NAME__", JSON.stringify(cacheName))
          .replace("__PRECACHE_ASSETS__", JSON.stringify(paths));
        this.emitFile({ type: "asset", fileName: "service-worker.js", source: worker });
      },
    },
  };
}
