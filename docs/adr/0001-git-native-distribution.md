# Git-native distribution; hosted discovery

Two concerns are split deliberately:

- **Distribution (`add` / `update`)** is git-native, with no backend. `patterns add user/repo` fetches the repo and reads its `patterns.yaml`, exactly as skills.sh *installs* skills. There is no database or auth in the install path, and publishing a pattern is just `git push`. The Registry layer keeps this behind a `PatternSource` interface so the resolver never needs a service.

- **Discovery (`find`)** is a thin client to a hosted search service. patterns.directory is therefore a site **plus** a search API (`/api/search`); the CLI holds no index itself — `GET ${PATTERNS_API_URL||patterns.directory}/api/search?q=…` — and the `source`/`ref` each result returns is fed straight back into the git-native `add`.

We chose git-native distribution over a hosted package index (which would add first-class versioning and download stats) because zero-ops install lets the ecosystem grow without us operating the critical path; a repo going away only affects that one pattern, not everyone. For discovery we chose a hosted search service because it keeps search quality server-side (fuzzy/semantic matching, install-ranked results) and the CLI thin, matching skills.sh.

We considered a fully static, fragmented index (a manifest + sharded JSON fetched and searched client-side, Pagefind-style) to avoid running any backend. It was prototyped and rejected: it cannot do semantic search or live install ranking, and it splits the index format into a contract between the crawler and the CLI that is awkward to evolve. The hosted API keeps discovery quality and the client simple, at the cost of operating one service.

## Status

accepted (amended — "no backend" scoped to distribution; discovery is a hosted service. A static fragmented index was considered and rejected.)
