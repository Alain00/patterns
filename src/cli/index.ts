import { init } from "./init";
import { add } from "./add";
import { list } from "./list";
import { remove } from "./remove";
import { validate } from "./validate";
import { scan } from "./scan";
import { detect } from "./detect";
import { emit } from "./emit";
import { find } from "./find";
import { update } from "./update";
import { publishCmd } from "./publish";
import { COMMAND_HELP, USAGE } from "./help";

export async function run(argv: string[]): Promise<void> {
  const [command, ...args] = argv;

  // Global help: no command, or help as the command.
  if (command === undefined || command === "-h" || command === "--help" || command === "help") {
    process.stdout.write(USAGE);
    return;
  }
  // Per-command help: `<command> --help` prints that command's descriptive usage
  // (before the command runs or touches stdin).
  if (args.includes("-h") || args.includes("--help")) {
    process.stdout.write(COMMAND_HELP[command] ?? USAGE);
    return;
  }

  switch (command) {
    case "init":
      return init(args);
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
      return scan(args);
    case "detect":
      return detect(args);
    case "emit":
      return emit(args[0]);
    case "find":
      requireArg(command, args[0], "query");
      return find(args[0]!);
    case "update":
      return update(args[0]);
    case "publish":
      return publishCmd(args[0]);
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
