# patterns — CLI architecture

Design of the `patterns` CLI: package structure, layer modules, and method surface.
Decisions and terminology live in [CONTEXT.md](../CONTEXT.md) and [docs/adr/](../docs/adr/). This file is the implementation map.

## Shape

Single npm package (TypeScript, Node, run via `npx patterns`), modeled on skills.sh.
`src/` is organized strictly by the three layers + a shared core, so a later split into a monorepo is mechanical.

```
patterns/
├── bin/
│   └── patterns.ts            # CLI entry, arg parsing → src/cli
├── src/
│   ├── core/                  # the arch.yaml contract — depended on by every layer
│   │   ├── schema.ts          # arch.yaml type + validator (zod)
│   │   ├── parse.ts           # read/serialize arch.yaml
│   │   ├── bundle.ts          # Pattern bundle model (.patterns/<name>/ tree)
│   │   └── validate.ts        # index-vs-files drift check (rich-index integrity)
│   ├── scanner/               # project → draft pattern   (authoring, v2)
│   │   ├── detect.ts          # stack/framework detection from package.json, conventions
│   │   ├── inventory.ts       # walk tree → folder map
│   │   └── draft.ts           # emit draft arch.yaml (empty summaries) + agent-fill instruction
│   ├── registry/              # transport: git-native, no backend
│   │   ├── source.ts          # PatternSource interface (GitSource now, ApiSource later)
│   │   ├── git-source.ts      # resolve user/repo → fetched bundle
│   │   ├── catalog.ts         # search the static patterns.directory index   (v2)
│   │   └── installed.ts       # read patterns installed in the current repo
│   ├── artifact/              # pattern → project files (descriptive only)
│   │   ├── materialize.ts     # write .patterns/<name>/ into target project
│   │   ├── router.ts          # create/update root AGENTS.md router
│   │   └── remove.ts          # delete bundle + clean router entry
│   └── cli/                   # one file per command, wires layers together
│       ├── init.ts  add.ts  list.ts  remove.ts  validate.ts      # v1
│       └── scan.ts  find.ts  update.ts                           # v2
└── tests/
```

## Layer method surface

Signatures are the contract; bodies are out of scope for this pass.

### core
```ts
type ArchYaml = {
  name: string; version: string; description: string; stack: string[];
  structure: { path: string; is: string }[];      // rich index — see ADR-0002
  rules:     { path: string; enforces: string }[];
  recipes:   { path: string; when: string }[];
  adrs:      { path: string; decides: string }[];
};
type Pattern = { arch: ArchYaml; root: string };   // root = bundle dir on disk

parseArch(dir: string): Pattern
serializeArch(p: Pattern): void
validatePattern(p: Pattern): Issue[]               // schema + every index path exists
```

### scanner  (v2)
```ts
detectStack(projectDir: string): string[]
inventory(projectDir: string): FolderNode[]
draft(projectDir: string): Pattern                 // empty summaries + AGENTS.md fill-instruction
```

### registry
```ts
interface PatternSource { resolve(ref: string): Promise<Pattern> }  // ADR-0001
class GitSource implements PatternSource { /* user/repo → bundle */ }
listInstalled(projectDir: string): InstalledPattern[]
search(query: string): CatalogEntry[]              // v2, static catalog
```

### artifact
```ts
materialize(p: Pattern, projectDir: string): void  // write .patterns/<name>/ ONLY — ADR-0002
writeRouter(projectDir: string): void              // root AGENTS.md → installed patterns
unmaterialize(name: string, projectDir: string): void
```

## Command → layer wiring

| Command | Phase | Calls |
|---|---|---|
| `init <name>`     | v1 | core: scaffold empty bundle tree |
| `add <ref>`       | v1 | registry.GitSource.resolve → core.validate → artifact.materialize + writeRouter |
| `list`            | v1 | registry.listInstalled |
| `remove <name>`   | v1 | artifact.unmaterialize |
| `validate [path]` | v1 | core.validatePattern |
| `scan <path>`     | v2 | scanner.draft → core.serializeArch |
| `find <query>`    | v2 | registry.search |
| `update [name]`   | v2 | registry.resolve → artifact.materialize (re-write) |

## Pattern bundle (the unit on disk)

```
<name>/
├── arch.yaml        # only structured file; identity + rich index (ADR-0002)
├── README.md        # for humans: what it is, trade-offs, how to use
├── AGENTS.md        # for agents: how to use/extend this pattern
├── structure/       # describe — domain.md, schema.md, …
├── rules/           # restrict — naming-conventions.md, …
├── recipes/         # action  — add-http-request.md, …
└── adrs/            # justify
```

Installed into a target repo as `.patterns/<name>/` with a root `AGENTS.md` router pointing at it. Source folders are never touched (ADR-0002).
