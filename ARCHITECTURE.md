# patterns — CLI architecture

Design of the `patterns` CLI: package structure, layer modules, and method surface.
Terminology lives in [CONTEXT.md](./CONTEXT.md). This file is the implementation map.

## Shape

Single package (TypeScript, run on **Bun** via `bun bin/patterns.ts` or the `patterns` bin), modeled on skills.sh. `src/` is organized strictly by layer + a shared core, so a later split into a monorepo is mechanical. The CLI is LLM-free and deterministic — the agent supplies the intelligence.

```
patterns/
├── bin/
│   └── patterns.ts            # CLI entry (#!/usr/bin/env bun) → run(argv) in src/cli
├── src/
│   ├── core/                  # the patterns.yaml contract — depended on by every layer
│   │   ├── schema.ts          # PatternManifest + boundarySchema (zod); Pattern interface
│   │   ├── parse.ts           # parseManifest / serializeManifest (MANIFEST_FILE = patterns.yaml)
│   │   ├── bundle.ts          # bundle layout: BUNDLE_DIRS, BUNDLE_FILES, INSTALL_DIR, ROUTER_FILE
│   │   └── validate.ts        # validatePattern → Issue[] (required files + path-safe rich index)
│   ├── scanner/               # Fase 1 (scan) — deterministic structure map
│   │   ├── inventory.ts       # tree walk → FolderNode + listFiles + detectConventions + isTestFile
│   │   ├── lang.ts            # tree-sitter engine (web-tree-sitter 0.22.6) → def/ref/import tags
│   │   ├── graph.ts           # buildGraph → FileGraph (import edges + name-ref edges; alias/workspace resolution)
│   │   ├── pagerank.ts        # power-iteration PageRank over the graph
│   │   ├── stack.ts           # detectStack — dep/config markers → stack tags
│   │   ├── map.ts             # scanProject — assembles the ScanFindings JSON
│   │   └── types.ts           # ScanFindings / FileGraph / Convention / RankedFile
│   ├── detect/                # Fase 2 (detect) — reflexion diff
│   │   ├── intended.ts        # inferIntended — majority-rule conventions + stack → IntendedPattern
│   │   ├── layers.ts          # LayerModel (CANONICAL_LAYERS default, `--layers` override) + makeLayerModel
│   │   ├── cycles.ts          # findCycles — Tarjan SCC over import edges
│   │   ├── boundaries.ts      # findLayerViolations — back-edges / skip-edges vs the inferred layering
│   │   ├── declared.ts        # findBoundaryViolations + loadBoundaries — enforce patterns.yaml `boundaries:`
│   │   ├── findings.ts        # detectProject — assembles DetectFindings (convergences/divergences/absences)
│   │   └── types.ts           # DetectFindings / Incongruity / IntendedPattern
│   ├── emit/                  # Fase 4 (emit)
│   │   └── bundle.ts          # emitBundle — scaffold dir + serialize patterns.yaml + validate
│   ├── registry/              # transport: git-native, no backend
│   │   ├── source.ts          # PatternSource interface (resolve(ref) → Pattern)
│   │   ├── git-source.ts      # GitSource + parseRef (owner/repo[/subdir][#ref], hosts, local paths)
│   │   ├── catalog.ts         # search the static patterns.directory index   (v2 — throws, not implemented)
│   │   └── installed.ts       # listInstalled → InstalledPattern[] (read .patterns/ in the current repo)
│   ├── artifact/              # pattern → project files (descriptive only)
│   │   ├── materialize.ts     # write .patterns/<name>/ into target project
│   │   ├── router.ts          # create/update the root AGENTS.md router
│   │   └── remove.ts          # unmaterialize: delete bundle + clean router entry
│   └── cli/                   # one file per command + shared parsing/help, wired by index.ts
│       ├── index.ts           # run(argv): global + per-command --help, then dispatch
│       ├── args.ts            # parseArgs + strFlag/numFlag/listFlag/boolFlag/firstPositional
│       ├── help.ts            # USAGE (global) + COMMAND_HELP (per-command — documents flags + defaults)
│       ├── init.ts  add.ts  list.ts  remove.ts  validate.ts      # v1
│       └── scan.ts  detect.ts  emit.ts  find.ts  update.ts       # v2 (find/update are stubs)
└── tests/
```

## Layer method surface

Real exported signatures; bodies are out of scope for this map.

### core
```ts
type BoundaryRule = { from: string; to: string; why: string };          // glob from→to forbid
type PatternManifest = {
  name: string; version: string; description: string; stack: string[];
  structure: { path: string; is: string }[];       // rich index
  rules:     { path: string; enforces: string }[];
  recipes:   { path: string; when: string }[];
  adrs:      { path: string; decides: string }[];
  boundaries: BoundaryRule[];                        // declared boundaries
};
interface Pattern { manifest: PatternManifest; root: string }   // root = bundle dir on disk

parseManifest(dir: string): Pattern
serializeManifest(p: Pattern): void
validatePattern(p: Pattern): Issue[]    // required files present + every index path is a safe, in-bundle, existing file
```

### scanner  (Fase 1)
```ts
scanProject(dir: string, opts?: { limit?; conventionsLimit?; skip? }): Promise<ScanFindings>
detectStack(dir: string): string[]
inventory(dir: string, opts?: { skip? }): FolderNode            // a single root FolderNode, not an array
listFiles(dir: string, opts?: { skip? }): string[]
detectConventions(files: string[]): Convention[]
buildGraph(dir: string, files: string[]): Promise<FileGraph>
pageRank(input: RankInput, opts?: PageRankOpts): Map<string, number>
```

### detect  (Fase 2)
```ts
// DetectOptions: skip / testDirs / includeTests / layers / maxLayerSkip / dominantShare /
//                dominantMinCount / minLayers / topConventions / boundaries
detectProject(dir: string, opts?: DetectOptions): Promise<DetectFindings>
inferIntended(conventions: Convention[], stack: string[], opts?): IntendedPattern
findCycles(graph: FileGraph): Incongruity[]
findLayerViolations(graph: FileGraph, intended: IntendedPattern, opts?): Incongruity[]
findBoundaryViolations(graph: FileGraph, rules: BoundaryRule[]): Incongruity[]
loadBoundaries(fileOrDir: string): BoundaryRule[]
```

### emit  (Fase 4)
```ts
emitBundle(manifest: PatternManifest, dir: string): Issue[]   // scaffold + write patterns.yaml + validate
```

### registry
```ts
interface PatternSource { resolve(ref: string): Promise<Pattern> }
class GitSource implements PatternSource { /* parseRef → fetch → bundle */ }
parseRef(ref: string): ParsedRef                                     // owner/repo[/subdir][#ref] | host.tld/... | ./local
listInstalled(dir: string): InstalledPattern[]                      // { name, version, manifest, path }
search(query: string): CatalogEntry[]                               // v2 — throws "not implemented"
```

### artifact
```ts
materialize(p: Pattern, dir: string): string   // write .patterns/<name>/ ONLY (returns its path)
writeRouter(dir: string): void                 // root AGENTS.md → installed patterns
unmaterialize(name: string, dir: string): void
```

## Command → layer wiring

Commands take flags parsed by `cli/args.ts`; `cli/help.ts` is the source of truth for each command's options and defaults (`patterns <command> --help`).

| Command | Phase | Calls |
|---|---|---|
| `init <name>` `[--version --description]`                | v1 | core: scaffold empty bundle tree |
| `add <ref>`                                              | v1 | registry.GitSource.resolve → core.validatePattern (gate on error-level issues) → artifact.materialize + writeRouter |
| `list`                                                   | v1 | registry.listInstalled |
| `remove <name>`                                          | v1 | artifact.unmaterialize |
| `validate [path]`                                        | v1 | core.validatePattern |
| `scan [path]` `[--limit --conventions-limit --skip]`     | v2 | scanner.scanProject → ScanFindings JSON (stdout) |
| `detect [path]` `[--layers --boundaries --skip …]`       | v2 | detect.detectProject → reflexion-diff JSON (stdout) |
| `emit [dir]`                                             | v2 | emit.emitBundle (manifest JSON from stdin) → patterns.yaml + validate |
| `find <query>`                                           | v2 | registry.catalog.search — **not implemented (throws)** |
| `update [name]`                                          | v2 | registry.resolve → artifact.materialize — **not implemented (throws)** |

The PRODUCE flow (scan → detect → grill → emit) is driven by the `extract` Agent Skill (`skills/extract/`), not a CLI pipeline; the verbs are optional accelerators the agent may invoke and always overrides.

## Pattern bundle (the unit on disk)

```
<name>/
├── patterns.yaml      # only structured file; identity + rich index + boundaries
├── README.md          # for humans: what it is, trade-offs, how to use
├── AGENTS.md          # for agents: how to use/extend this pattern
├── structure/         # describe — domain.md, schema.md, …
├── rules/             # restrict — naming-conventions.md, …
├── recipes/           # action  — add-http-request.md, …
└── adrs/              # justify
```

Installed into a target repo as `.patterns/<name>/` with a root `AGENTS.md` router pointing at it. Source folders are never touched.
