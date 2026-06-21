import { scanProject } from "../scanner/map";
import { firstPositional, listFlag, numFlag, parseArgs } from "./args";

/**
 * Fase 1 (`scan`) — emit a deterministic structure-map (findings JSON) to stdout.
 * An accelerator tool the `extract` agent may invoke; never authoritative over the
 * agent's own reading of the repo. No LLM, no network.
 * Options (see `patterns scan --help`): --limit, --conventions-limit, --skip.
 */
export async function scan(args: string[] = []): Promise<void> {
  const p = parseArgs(args);
  const path = firstPositional(p) ?? process.cwd();
  const findings = await scanProject(path, {
    limit: numFlag(p, "limit"),
    conventionsLimit: numFlag(p, "conventions-limit"),
    skip: listFlag(p, "skip"),
  });
  process.stdout.write(`${JSON.stringify(findings, null, 2)}\n`);
}
