import { readSourceFixture } from "./source-fixture.mjs";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
const root = new URL("../../", import.meta.url).pathname;
const stateFiles = readdirSync(resolve(root, "src/state")).filter((name) =>
  name.endsWith(".mjs"),
);
const imports = [],
  names = [];
stateFiles.forEach((file, index) => {
  const path = resolve(root, "src/state", file);
  const exports = [
    ...readFileSync(path, "utf8").matchAll(/export const (\w+Store)\b/g),
  ].map((match) => match[1]);
  if (!exports.length) return;
  imports.push(
    `import { ${exports.join(", ")} } from ${JSON.stringify(path)};`,
  );
  names.push(...exports);
});
const result = await build({
  stdin: {
    contents: `${imports.join("\n")}
      import {createElement} from 'react';
      import {createRoot} from 'react-dom/client';
      import {flushSync} from 'react-dom';
      import {AppLayout} from './src/components/AppLayout.jsx';
      import {events as appEvents} from './src/app/actions.mjs';
      globalThis.__reactEvents = appEvents;
      globalThis.__reactViews = {${names.join(", ")}};
      const host=document.getElementById('root');
      if(host?.nodeType===1){
        const app=createRoot(host);
        globalThis.__flushReactViews=()=>flushSync(()=>app.render(createElement(AppLayout)));
        globalThis.__unmountReactViews=()=>flushSync(()=>app.unmount());
        __flushReactViews();
      }`,
    resolveDir: root,
  },
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  target: "es2022",
  define: { "process.env.NODE_ENV": '"production"' },

});
const bootstrap =
  result.outputFiles[0].text +
  "\nconst {" +
  names.join(", ") +
  "} = globalThis.__reactViews;";
export function readRuntimeSource(path) {
  if (path === "react-views") return bootstrap;
  return readSourceFixture(resolve(root, path), "utf8");
}
