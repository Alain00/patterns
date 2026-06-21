/**
 * CLI help text. The global synopsis plus a descriptive per-command page that
 * documents every flag and its default. `patterns <command> --help` prints the
 * matching page (see src/cli/index.ts). Flags expose policy the agent controls;
 * with no flags the deterministic defaults apply.
 */

export const USAGE = `patterns — a registry for architecture patterns

Usage: patterns <command> [args] [options]

v1
  init <name>        scaffold a new empty pattern bundle
  add <ref>          fetch a pattern from a git ref and install it (descriptive only)
  list               list patterns installed in this project
  remove <name>      uninstall a pattern
  validate [path]    check patterns.yaml + that the rich index matches real files

v2
  scan [path]        emit a structure-map (findings JSON) of a codebase
  detect [path]      emit architectural incongruities (reflexion diff JSON)
  emit [dir]         write a bundle from a manifest JSON on stdin
  find <query>       search the patterns.directory catalog
  update [name]      refresh installed pattern(s)
  publish [ref]      register a pattern in the patterns.directory index
                     (ref inferred from the current git repo when omitted)

Run \`patterns <command> --help\` for a command's options and defaults.
`;

const SCAN_HELP = `patterns scan [path] — emit a deterministic structure-map (findings JSON)

The extract agent's accelerator for large repos: a token-efficient map (folder tree,
stack, majority-rule conventions, PageRank-ranked files). Never authoritative — the
agent's own reading of the repo always wins. No LLM, no network.

Arguments:
  path                      repo to scan (default: current directory)

Options:
  --limit <n>               max PageRank-ranked files kept in the map (default: 100)
  --conventions-limit <n>   max convention signals emitted (default: 50)
  --skip <name,...>         extra directory names to skip, ADDED on top of the built-in
                            defaults (node_modules, .git, dist, build, .next, .turbo, …)
                            and the repo's root .gitignore. The defaults are never removed.
  -h, --help                show this help

The walk reads the repo's root .gitignore only (not nested ones); use --skip for the rest.
`;

const DETECT_HELP = `patterns detect [path] — emit the reflexion diff (findings JSON)

The intended pattern + scored, intent-independent structural incongruities (import
cycles, layer violations) and the convergence/absence summary. Findings seed the grill;
the agent adjudicates and always overrides them. No LLM, no network.

Arguments:
  path                      repo to analyze (default: current directory)

Options:
  --layers <g1|g2|...>      override the layer vocabulary, outer→inner groups separated
                            by '|' and synonyms by ','. Default (backend/DDD):
                            "controller,resolver,gateway,handler|service,usecase,facade,manager|repository,dao,entity,model".
                            A Next app, for example: --layers "page,route|component|hook|lib"
  --max-layer-skip <n>      allowed inward layer distance before an edge "skips a layer"
                            (default: 1 — depending one layer inward is fine)
  --dominant-share <0..1>   min share of its family for a convention to count as intended (default: 0.2)
  --dominant-min-count <n>  min absolute count for a convention to count as intended (default: 3)
  --min-layers <n>          min distinct layers before a layering is inferred at all (default: 2)
  --top-conventions <n>     dominant conventions summarized in convergences (default: 6)
  --test-dir <name,...>     extra directory names treated as tests (excluded from the
                            architecture), ADDED on top of: tests, test, __tests__, e2e, __mocks__
  --include-tests           include test files in the analysis (default: tests are excluded)
  --skip <name,...>         extra directory names to skip from the walk (see \`scan --help\`)
  --boundaries <file>       a patterns.yaml whose \`boundaries:\` block (glob from→to forbid
                            rules) is enforced against the repo's imports; each violated rule
                            is a boundary-violation. Defaults to an auto-read patterns.yaml at
                            the repo root, if present.
  -h, --help                show this help
`;

const INIT_HELP = `patterns init <name> — scaffold a new, empty pattern bundle for hand-authoring

Arguments:
  name                      bundle directory to create

Options:
  --version <semver>        starting manifest version (default: 0.1.0)
  --description <text>      one-line description (default: a TODO placeholder)
  -h, --help                show this help
`;

const EMIT_HELP = `patterns emit [dir] — write a pattern bundle from a manifest JSON on stdin

Reads the manifest the agent resolved (pipe it in), scaffolds <dir>, writes
patterns.yaml, and validates the rich index. The agent authors the prose; emit only
serializes structure. No LLM, no network.

Note: emit's validation requires README.md and AGENTS.md in <dir> — emit does NOT write
them, you do. Author the prose first, or a fresh-dir emit exits non-zero on those files.

Usage:
  cat manifest.json | patterns emit ./my-pattern

Arguments:
  dir                       bundle directory to write (default: current directory)

Options:
  -h, --help                show this help
`;

const VALIDATE_HELP = `patterns validate [path] — check a bundle's manifest and rich index

Verifies patterns.yaml parses, the required files exist (patterns.yaml, README.md,
AGENTS.md), and every rich-index path points at a real file inside its section.

Arguments:
  path                      bundle directory (default: current directory)
`;

const ADD_HELP = `patterns add <ref> — fetch a pattern from a git ref and install it

Installs descriptively under .patterns/<name>/ and updates the root AGENTS.md router;
never writes your source. Records the ref in a .origin sidecar so \`update\` can refresh it.

Arguments:
  ref                       a git locator, e.g. owner/repo, owner/repo#tag,
                            owner/repo/subdir, host.tld/owner/repo, or a local ./path
                            (default host: github.com)

Sends a best-effort, opt-out install ping after a successful install
(PATTERNS_TELEMETRY=0 to disable); it never blocks or breaks the install.
`;

const LIST_HELP = `patterns list — list patterns installed in this project (under .patterns/)
`;

const REMOVE_HELP = `patterns remove <name> — uninstall a pattern and clean its router entry

Arguments:
  name                      installed pattern name
`;

const FIND_HELP = `patterns find <query> — search the patterns.directory catalog

Queries the hosted patterns.directory search API and prints each match's ref, ready to
pass to \`patterns add\`. Results are install-ranked. Set PATTERNS_API_URL to point at a
private/internal catalog.

Arguments:
  query                     search terms
`;

const UPDATE_HELP = `patterns update [name] — refresh installed pattern(s)

Re-resolves each installed pattern from the ref it was added from (recorded in its
.origin sidecar), re-validates, and re-materializes it. With no name, updates every
installed pattern; patterns with no recorded origin are skipped with a warning.

Arguments:
  name                      pattern to refresh (default: all installed)
`;

const PUBLISH_HELP = `patterns publish [ref] — register a pattern in the patterns.directory index

POSTs only the ref to the hosted index; the server fetches and validates the pattern's
patterns.yaml from the ref itself (no content is uploaded). The ref is optional — when
omitted it is inferred from the current git repo (origin remote + the patterns.yaml
location). Distribution stays git-native; the index is a discovery cache.

Arguments:
  ref                       a git locator (default: inferred from the current repo)
`;

/** Per-command descriptive usage, keyed by command name. */
export const COMMAND_HELP: Record<string, string> = {
  scan: SCAN_HELP,
  detect: DETECT_HELP,
  init: INIT_HELP,
  emit: EMIT_HELP,
  validate: VALIDATE_HELP,
  add: ADD_HELP,
  list: LIST_HELP,
  remove: REMOVE_HELP,
  find: FIND_HELP,
  update: UPDATE_HELP,
  publish: PUBLISH_HELP,
};
