import { init } from "./init";
import { add } from "./add";
import { list } from "./list";
import { remove } from "./remove";
import { validate } from "./validate";
import { scan } from "./scan";
import { find } from "./find";
import { update } from "./update";

const USAGE = `patterns — a registry for architecture patterns

Usage: patterns <command> [args]

v1
  init <name>        scaffold a new empty pattern bundle
  add <ref>          fetch a pattern from a git ref and install it (descriptive only)
  list               list patterns installed in this project
  remove <name>      uninstall a pattern
  validate [path]    check patterns.yaml + that the rich index matches real files

v2
  scan [path]        draft a pattern from an existing codebase
  find <query>       search the patterns.directory catalog
  update [name]      refresh installed pattern(s)
`;

export async function run(argv: string[]): Promise<void> {
  const [command, ...args] = argv;

  switch (command) {
    case "init":
      requireArg(command, args[0], "name");
      return init(args[0]!);
    case "add":
      requireArg(command, args[0], "ref");
      return add(args[0]!);
    case "list":
      return list();
    case "remove":
      requireArg(command, args[0], "name");
      return remove(args[0]!);
    case "validate":
      return validate(args[0]);
    case "scan":
      return scan(args[0]);
    case "find":
      requireArg(command, args[0], "query");
      return find(args[0]!);
    case "update":
      return update(args[0]);
    case undefined:
    case "-h":
    case "--help":
    case "help":
      process.stdout.write(USAGE);
      return;
    default:
      process.stderr.write(`unknown command: ${command}\n\n${USAGE}`);
      process.exitCode = 1;
  }
}

function requireArg(command: string, value: string | undefined, name: string): void {
  if (value === undefined) {
    process.stderr.write(`"${command}" requires <${name}>\n`);
    process.exit(1);
  }
}
