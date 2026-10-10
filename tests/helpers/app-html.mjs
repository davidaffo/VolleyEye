import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const result = buildSync({
  entryPoints: [new URL('../../src/components/AppLayout.jsx', import.meta.url).pathname],
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', external: ['virtual:volleyeye-runtime'], jsx: 'automatic'
});
const module = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports);
const shell = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const markup = renderToStaticMarkup(createElement(module.exports.AppLayout));
const html = shell.replace('<div id="root"></div>', '<div id="root">' + markup + '</div>');
export function readAppHtml() { return html; }
