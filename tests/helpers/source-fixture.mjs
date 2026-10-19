import { readFileSync } from 'node:fs';
import { parsers } from 'prettier/plugins/babel';
import { dirname, resolve } from 'node:path';

const cache = new Map();

// Isolate the real function bodies for unit cases that provide their own dependencies.
// The browser and module integration suites execute the complete native module graph.
export function readSourceFixture(path, encoding) {
  const source = readFileSync(path, encoding);
  const name = path instanceof URL ? path.pathname : String(path);
  if (!encoding || !name.endsWith('.js') || !/(?:\/|^)(?:src\/(?:features|domain|app)|js\/globals)/.test(name)) return source;
  if (cache.has(name)) return cache.get(name);
  const ast = parsers.babel.parse(source).program;
  const aliases = new Set();
  const libraries = new Map();
  const libraryNames = { isolation:'stateIsolation', lineup:'lineup', autoRole:'autoRole', roster:'roster', opponentRoster:'opponentSettings' };
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') for (const spec of node.specifiers) {
      if (spec.imported?.name === 'session') aliases.add(spec.local.name);
      if (libraryNames[spec.imported?.name]) libraries.set(spec.local.name, libraryNames[spec.imported.name]);
    }
    if (node.type === 'VariableDeclaration') for (const decl of node.declarations) {
      if (decl.init?.name === 'session') aliases.add(decl.id.name);
    }
  }
  let result = ast.body.map(node => {
    if (node.type === 'ImportDeclaration') return '';
    const decl = node.type === 'ExportNamedDeclaration' ? node.declaration : node;
    if (!decl) return '';
    if (decl.type === 'VariableDeclaration' && decl.declarations.some(d => d.init?.name === 'session')) return '';
    if (decl.type === 'VariableDeclaration' && decl.declarations[0].id.name === 'session') {
      return decl.declarations[0].init.arguments.flatMap(argument => argument.properties).map(p =>
        `${/^[A-Z_]+$/.test(p.key.value || p.key.name) ? "const" : "let"} ${p.key.value || p.key.name} = ${p.value.body.type === "ObjectExpression" ? "(" : ""}${source.slice(p.value.body.start, p.value.body.end)}${p.value.body.type === "ObjectExpression" ? ")" : ""};`
      ).join('\n');
    }
    return source.slice(decl.start, decl.end);
  }).join('\n');
  for (const alias of aliases) result = result.replace(new RegExp(`\\b${alias}\\.([A-Za-z_$][\\w$]*)`, 'g'), '$1');
  result = result.replace(/\bbrowserEffectsState\./g, '');
  const edits = [];
  function bindings(pattern, names) {
    if (!pattern) return;
    if (pattern.type === 'Identifier') names.add(pattern.name);
    else if (pattern.type === 'RestElement') bindings(pattern.argument, names);
    else if (pattern.type === 'AssignmentPattern') bindings(pattern.left, names);
    else if (pattern.type === 'ObjectPattern') pattern.properties.forEach(p => bindings(p.value || p.argument, names));
    else if (pattern.type === 'ArrayPattern') pattern.elements.forEach(p => bindings(p, names));
  }
  function references(node, names = new Set(), parent = null, key = '') {
    if (!node || typeof node !== 'object') return;
    if (/Function|Method/.test(node.type)) {
      names = new Set(names);
      (node.params || []).forEach(p => bindings(p, names));
      if (node.id) bindings(node.id, names);
    }
    if (node.type === 'Program' || node.type === 'BlockStatement') {
      names = new Set(names);
      for (const item of node.body) {
        if (item.type === 'VariableDeclaration') item.declarations.forEach(d => bindings(d.id, names));
        if (item.type === 'FunctionDeclaration') bindings(item.id, names);
      }
    }
    if (node.type === 'Identifier' && libraries.has(node.name) && !names.has(node.name)) {
      const property = key === 'property' && !parent.computed || key === 'key' && !parent.computed || key === 'id';
      if (!property) edits.push({ start: node.start, end: node.end, text: `(typeof window !== 'undefined' ? window : globalThis).VolleyEye?.${libraries.get(node.name)}` });
    }
    for (const [childKey,value] of Object.entries(node)) {
      if (childKey === 'loc') continue;
      if (Array.isArray(value)) value.forEach(v => references(v,names,node,childKey));
      else if (value && typeof value === 'object') references(value,names,node,childKey);
    }
  }
  references(parsers.babel.parse(result).program);
  for (const edit of edits.sort((a,b)=>b.start-a.start)) result=result.slice(0,edit.start)+edit.text+result.slice(edit.end);

  if (/(^|\/)src\/domain\//.test(name)) {
    const lib = { isolation: 'stateIsolation', lineup: 'lineup', autoRole: 'autoRole', roster: 'roster', matchForms: 'matchSettings', opponentRoster: 'opponentSettings' };
    const api = ast.body.find(n => n.type === 'ExportNamedDeclaration' && n.declaration?.type === 'VariableDeclaration')?.declaration.declarations[0].id.name;
    if (lib[api]) result = `(function(){ ${result}\n const host = typeof window !== 'undefined' ? window : globalThis; host.VolleyEye ||= {}; host.VolleyEye.${lib[api] || api} = ${api}; })();`;
  }
  // Unit fixtures keep the real initializers when a controller's own session moves.
  const ownSession = ast.body.find(node => node.type === 'ImportDeclaration' &&
    node.specifiers.some(spec => spec.imported?.name === 'session' && spec.local.name === 'session'));
  if (ownSession) result = readSourceFixture(resolve(dirname(name), ownSession.source.value), 'utf8') + '\n' + result;
  cache.set(name, result);
  return result;
}
