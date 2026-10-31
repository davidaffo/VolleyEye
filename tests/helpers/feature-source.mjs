import { readSourceFixture } from './source-fixture.mjs';
import { sourceFunctions } from './source-functions.mjs';
import { parsers } from 'prettier/plugins/babel';

export function featureSource(paths, names) {
  return (Array.isArray(paths) ? paths : [paths]).map(path => {
    const source = readSourceFixture(new URL('../../' + path, import.meta.url), 'utf8');
    const functions = names || parsers.babel.parse(source).program.body
      .filter(node => node.type === 'FunctionDeclaration').map(node => node.id.name);
    return sourceFunctions(source, functions);
  }).join('\n');
}
