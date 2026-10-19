import { build } from "esbuild";
import { resolve } from "node:path";

// The offline report runs the same React application, bundled into one script.
export async function buildAnalysisExport(root) {
  const result = await build({
    entryPoints: [resolve(root, "src/main.jsx")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    minify: true,
    jsx: "automatic",
    loader: { ".css": "empty" },
    define: {
      "import.meta.env": JSON.stringify({
        DEV: false,
        PROD: true,
        BASE_URL: "./",
      }),
      "import.meta.hot": "undefined",
      "process.env.NODE_ENV": '"production"',
    },
  });
  return result.outputFiles[0].text;
}
