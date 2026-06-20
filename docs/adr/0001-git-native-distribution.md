# Git-native pattern distribution

Patterns are resolved and distributed straight from git repositories (and local paths), not from a hosted registry — `patterns add user/repo` fetches the repo and reads its `patterns.yaml`, exactly as skills.sh resolves skills. patterns.directory is a static catalog website that links to those repos; there is no backend, database, or auth to operate, and publishing is just `git push`.

We chose this over a hosted index (which would give first-class search, versioning, and download stats) because zero-ops distribution lets the project ship and the ecosystem grow without us running a service. The name "patterns.directory" implies a hosted registry, which is why this is worth recording: it is a deliberate deviation. The Registry layer is kept behind a source interface so a hosted index can be added later without touching the Scanner or Artifact layers.

## Status

accepted
