import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runtimeFiles } from '../config/runtime-files.mjs';

export function readCompatibilitySources(root, { includeVersion = false, watch = () => {} } = {}) {
  return runtimeFiles.filter(path => includeVersion || path !== 'js/app-version.js').map(path => {
    const absolutePath = resolve(root, path);
    watch(absolutePath);
    let source = readFileSync(absolutePath, 'utf8');
    if (path === 'js/scout/core/bootstrap.js') {
      const offset = source.indexOf('document.addEventListener("DOMContentLoaded"');
      if (offset < 0) throw new Error('Compatibility bootstrap listener not found');
      source = source.slice(0, offset);
    }
    return '\n// Source: ' + path + '\n' + source;
  }).join('\n');
}
