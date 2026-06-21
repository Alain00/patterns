/**
 * Minimal CLI argument parsing for the verbs that take agent-supplied options.
 * Splits a command's args into positionals + flags. Flags encode policy the agent
 * should control (skip lists, limits, the layer vocabulary, inference thresholds)
 * and override the deterministic defaults; with no flags, behaviour is unchanged
 * (the agent is the intelligence, the CLI exposes the knobs).
 *
 * Boolean flags must be declared so they don't greedily consume the next positional
 * (e.g. `detect --include-tests .` must not read "." as the flag's value).
 */
export interface ParsedArgs {
  positionals: string[];
  flags: Map<string, string | true>;
}

export function parseArgs(args: string[], opts: { booleans?: string[] } = {}): ParsedArgs {
  const booleans = new Set(opts.booleans ?? []);
  const positionals: string[] = [];
  const flags = new Map<string, string | true>();

  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string;
    if (a.startsWith("--")) {
      const body = a.slice(2);
      const eq = body.indexOf("=");
      if (eq >= 0) {
        flags.set(body.slice(0, eq), body.slice(eq + 1)); // --flag=value
      } else if (booleans.has(body)) {
        flags.set(body, true); // declared boolean: never consumes the next token
      } else {
        const next = args[i + 1];
        if (next !== undefined && !next.startsWith("-")) {
          flags.set(body, next); // --flag value
          i++;
        } else {
          flags.set(body, true); // --flag (no value followed)
        }
      }
    } else if (a.startsWith("-") && a.length > 1) {
      flags.set(a.slice(1), true); // short boolean flag, e.g. -h
    } else {
      positionals.push(a);
    }
  }
  return { positionals, flags };
}

/** First positional argument, or undefined. */
export function firstPositional(p: ParsedArgs): string | undefined {
  return p.positionals[0];
}

/** A string-valued flag, or undefined when absent (or given as a bare boolean). */
export function strFlag(p: ParsedArgs, name: string): string | undefined {
  const v = p.flags.get(name);
  return typeof v === "string" ? v : undefined;
}

/** A comma-separated list flag → trimmed, non-empty parts (empty array when absent). */
export function listFlag(p: ParsedArgs, name: string): string[] {
  const v = strFlag(p, name);
  if (!v) return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

/** A numeric flag. Returns `dflt` (possibly undefined) when absent; throws on a non-number. */
export function numFlag(p: ParsedArgs, name: string): number | undefined;
export function numFlag(p: ParsedArgs, name: string, dflt: number): number;
export function numFlag(p: ParsedArgs, name: string, dflt?: number): number | undefined {
  const v = p.flags.get(name);
  if (v === undefined) return dflt;
  const n = Number(typeof v === "string" ? v : NaN);
  if (!Number.isFinite(n)) throw new Error(`--${name} expects a number, got "${v === true ? "" : v}"`);
  return n;
}

/** A boolean flag — true when present (declare it in parseArgs `booleans`). */
export function boolFlag(p: ParsedArgs, name: string): boolean {
  return p.flags.has(name);
}
