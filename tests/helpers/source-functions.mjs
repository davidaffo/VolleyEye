import { parsers } from "prettier/plugins/babel";

export function sourceFunctions(source, names) {
  const wanted = new Set(names);
  return parsers.babel
    .parse(source)
    .program.body.filter(
      (node) => node.type === "FunctionDeclaration" && wanted.has(node.id.name),
    )
    .map((node) => source.slice(node.start, node.end))
    .join("\n");
}
