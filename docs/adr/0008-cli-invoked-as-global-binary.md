# The CLI is invoked as a global `patterns` binary, installed git-native

The `extract` skill and all user-facing docs invoke the CLI as bare `patterns <verb>` (e.g. `patterns scan .`). The CLI is obtained git-native — clone the repo and `bun link` it — exactly as patterns themselves are distributed (ADR-0001). There is no npm publish step yet, and the docs deliberately do **not** tell anyone to run `npx patterns`.

We chose this over `npx patterns` because the `extract` skill runs inside the *user's target repo*, not this repo: `bun bin/patterns.ts` does not exist there, and `npx patterns` would resolve to (and execute) an unrelated package published under that name on npm — actively wrong, not merely missing. A globally-linked binary is the only invocation that works across repos with zero ambiguity, and `bun link` keeps distribution consistent with the git-native stance.

This is worth recording because it is surprising and a real trade-off: a Bun CLI "looks like" it should ship via npm and be run with `npx`, so a contributor will be tempted to switch the skill back to `npx patterns`. Until the package is published under a name we own, that must not happen — the verbs are invoked as `patterns`, and if the binary is absent the agent reads the repo directly (the verbs are optional accelerators, per ADR-0003/0004). When a hosted/npm channel is added later, this decision can be revisited and the package renamed then.

## Status

accepted
