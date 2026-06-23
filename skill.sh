#!/usr/bin/env bash
#
# skill.sh — install the `consume` skill + agent-instruction references into a repo,
# in every supported agent format (.claude/skills, AGENTS.md, CLAUDE.md, Cursor rule,
# GitHub Copilot instructions). Run it inside the target repo, or pass a path:
#
#   ./skill.sh [target-dir]      # default: current directory
#
# It just drives `patterns sync`, so it stays in lockstep with what `patterns add`
# wires automatically. Idempotent — re-running only refreshes the managed blocks.
set -euo pipefail

target="${1:-$PWD}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Prefer the globally-linked binary; fall back to running from this clone.
if command -v patterns >/dev/null 2>&1; then
  patterns sync "$target"
elif command -v bun >/dev/null 2>&1; then
  bun "$here/bin/patterns.ts" sync "$target"
else
  echo "skill.sh: need either the 'patterns' binary on PATH (bun link) or 'bun' to run from source" >&2
  exit 1
fi
