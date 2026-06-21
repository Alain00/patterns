/**
 * Tree-sitter engine for Fase 1 (`scan`) — LLM-free, deterministic.
 *
 * Wraps `web-tree-sitter` (pinned to 0.22.6 — newer cores have an ABI mismatch with
 * the prebuilt `tree-sitter-wasms` grammars) and resolves the core + grammar `.wasm`
 * via `require.resolve` so it works under a globally-linked `patterns` from any cwd, not just here.
 *
 * MVP languages: TS / TSX / JS (the user's NestJS stack). Adding a grammar = one entry
 * in GRAMMARS + EXT_LANG + a tags query.
 */
import { createRequire } from "node:module";
import { extname } from "node:path";
import Parser from "web-tree-sitter";
import type { FileTags, Tag } from "./types";

const require = createRequire(import.meta.url);

export type LangKey = "ts" | "tsx" | "js";

const GRAMMARS: Record<LangKey, string> = {
  ts: "tree-sitter-typescript",
  tsx: "tree-sitter-tsx",
  js: "tree-sitter-javascript",
};

const EXT_LANG: Record<string, LangKey> = {
  ".ts": "ts",
  ".mts": "ts",
  ".cts": "ts",
  ".tsx": "tsx",
  ".js": "js",
  ".mjs": "js",
  ".cjs": "js",
  ".jsx": "js",
};

/** Tags query per language. Capture names encode `<kind>.<symbolKind>`. */
const TS_QUERY = `
(function_declaration name: (identifier) @def.function)
(method_definition name: (property_identifier) @def.method)
(class_declaration name: (type_identifier) @def.class)
(interface_declaration name: (type_identifier) @def.interface)
(type_alias_declaration name: (type_identifier) @def.type)
(enum_declaration name: (identifier) @def.enum)
(variable_declarator name: (identifier) @def.variable)

(call_expression function: (identifier) @ref.call)
(call_expression function: (member_expression property: (property_identifier) @ref.call))
(new_expression constructor: (identifier) @ref.new)

(import_statement source: (string (string_fragment) @import.source))
(export_statement source: (string (string_fragment) @import.source))
`;

const JS_QUERY = `
(function_declaration name: (identifier) @def.function)
(method_definition name: (property_identifier) @def.method)
(class_declaration name: (identifier) @def.class)
(variable_declarator name: (identifier) @def.variable)

(call_expression function: (identifier) @ref.call)
(call_expression function: (member_expression property: (property_identifier) @ref.call))
(new_expression constructor: (identifier) @ref.new)

(import_statement source: (string (string_fragment) @import.source))
(export_statement source: (string (string_fragment) @import.source))
`;

const QUERIES: Record<LangKey, string> = { ts: TS_QUERY, tsx: TS_QUERY, js: JS_QUERY };

let initialized = false;
const langCache = new Map<LangKey, unknown>();
const parserCache = new Map<LangKey, unknown>();
const queryCache = new Map<LangKey, unknown>();

async function ensureInit(): Promise<void> {
  if (initialized) return;
  const core = require.resolve("web-tree-sitter/tree-sitter.wasm");
  await Parser.init({ locateFile: () => core });
  initialized = true;
}

async function loadLang(key: LangKey): Promise<any> {
  const cached = langCache.get(key);
  if (cached) return cached;
  await ensureInit();
  const wasm = require.resolve(`tree-sitter-wasms/out/${GRAMMARS[key]}.wasm`);
  const lang = await (Parser as any).Language.load(wasm);
  langCache.set(key, lang);
  return lang;
}

/**
 * One reused Parser per language. tree-sitter Parsers are WASM-heap backed and
 * must be freed; reusing one per LangKey (buildGraph parses files sequentially,
 * one `await` at a time) avoids both a per-file allocation and a per-file leak.
 */
async function loadParser(key: LangKey): Promise<any> {
  const cached = parserCache.get(key);
  if (cached) return cached;
  const language = await loadLang(key);
  const parser = new Parser();
  parser.setLanguage(language);
  parserCache.set(key, parser);
  return parser;
}

/** Map a file path to its language key by extension, or null if unsupported. */
export function langForFile(path: string): LangKey | null {
  return EXT_LANG[extname(path).toLowerCase()] ?? null;
}

/** All file extensions the scanner can parse. */
export function supportedExtensions(): string[] {
  return Object.keys(EXT_LANG);
}

/**
 * Parse `code` as `lang` and bucket its tags into defs / refs / import sources.
 * Pure given the grammar; caches the parser/language/query across calls.
 */
export async function extractTags(code: string, lang: LangKey): Promise<FileTags> {
  const parser = await loadParser(lang);

  let query = queryCache.get(lang) as any;
  if (!query) {
    const language = await loadLang(lang);
    query = language.query(QUERIES[lang]);
    queryCache.set(lang, query);
  }

  const tree = parser.parse(code);
  const result: FileTags = { defs: [], refs: [], imports: [] };

  for (const cap of query.captures(tree.rootNode)) {
    const [kind, symbolKind] = cap.name.split(".") as [string, string];
    const text = cap.node.text;
    const line = cap.node.startPosition.row;
    if (kind === "import") {
      result.imports.push(text);
    } else if (kind === "def" || kind === "ref") {
      const tag: Tag = { name: text, kind, symbolKind, line };
      (kind === "def" ? result.defs : result.refs).push(tag);
    }
  }

  tree.delete?.();
  return result;
}
