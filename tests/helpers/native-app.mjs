import { build } from 'esbuild';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsers } from 'prettier/plugins/babel';
const root = new URL('../../', import.meta.url).pathname;
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
const modules = ['js/globals.js', 'src/domain/counts.js', 'src/domain/events.js', ...files('src/features').filter(p => p.endsWith('.js')), 'src/app/application.js', 'src/app/browser-effects.js', 'src/app/app-actions.js', 'src/app/lifecycle.js', 'src/app/dispose.js'];
const imports = [], publish = [];
modules.forEach((path, i) => {
  imports.push(`import * as feature${i} from ${JSON.stringify(resolve(root, path))};`);
  const source = readFileSync(resolve(root, path), 'utf8');
  const program = parsers.babel.parse(source).program;
  const session = program.body.find(n => n.type === 'ExportNamedDeclaration' && n.declaration?.declarations?.[0]?.id.name === 'session');
  const keys = session?.declaration.declarations[0].init.arguments.flatMap(argument => argument.properties.map(p => p.key.value || p.key.name)) || [];
  publish.push(`for (const [name,value] of Object.entries(feature${i})) if(name !== 'session') globalThis[name]=value;`);
  for (const key of keys) {
    if (path === 'src/app/browser-effects.js' && ['setTimeout','clearTimeout','setInterval','clearInterval'].includes(key)) continue;
    publish.push(`Object.defineProperty(globalThis, ${JSON.stringify(key)}, {configurable:true,get:()=>feature${i}.session[${JSON.stringify(key)}],set:value=>{feature${i}.session[${JSON.stringify(key)}]=value;}});`);
  }
});
const stores = files('src/state').filter(p => p.endsWith('.mjs'));
const storeNames = [];
for (const path of stores) {
  const names = [...readFileSync(resolve(root,path),'utf8').matchAll(/export const (\w+Store)\b/g)].map(m => m[1]);
  if (!names.length) continue;
  imports.push(`import {${names.join(',')}} from ${JSON.stringify(resolve(root,path))};`);
  storeNames.push(...names);
}
const result = await build({
  stdin: { contents: `${imports.join('\n')}
    import {observeDomainChanges} from './src/app/view-publication.js';
    observeDomainChanges();
    import {createElement} from 'react';
    import {createRoot} from 'react-dom/client';
    import {flushSync} from 'react-dom';
    import {AppLayout} from './src/components/AppLayout.jsx';
    ${publish.join('\n')}
    globalThis.__reactViews={${storeNames.join(',')}};
    Object.assign(globalThis,globalThis.__reactViews);
    const host=document.getElementById('root');
    if(host?.nodeType===1){const app=createRoot(host);
      globalThis.__flushReactViews=()=>flushSync(()=>app.render(createElement(AppLayout)));
      globalThis.__unmountReactViews=()=>flushSync(()=>app.unmount());
      __flushReactViews();
    }`, resolveDir: root },
  bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',target:'es2022',define:{'process.env.NODE_ENV':'"production"'},
});
export const nativeAppSource = result.outputFiles[0].text;
