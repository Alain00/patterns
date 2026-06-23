# CONTEXT.md format

The grill materialises a glossary of the repo's domain language at `CONTEXT.md` (repo root). It is a
glossary and nothing else — no implementation detail, no spec, no scratch pad. The bundle's
`structure/` and `rules/` docs reuse this vocabulary so the pattern reads consistently.

## Structure

```md
# {Context name}

{One or two sentences: what this context is and why it exists.}

## Language

**Order**:
A customer's request to purchase, from placement to fulfilment.
_Avoid_: Purchase, transaction

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account
```

## Rules

- **Be opinionated.** When several words mean the same thing, pick the best and list the rest under `_Avoid_`.
- **Keep definitions tight.** One or two sentences. Define what it IS, not what it does.
- **Only domain-specific terms.** General programming concepts (timeouts, retries, error types) don't
  belong, even if used heavily. Ask: is this unique to this project's domain, or general? Only the former.
- **Group under subheadings** when natural clusters emerge; a flat list is fine otherwise.

## Lazily

Create `CONTEXT.md` when the first term resolves — not before. If a `CONTEXT-MAP.md` already exists at
the root, the repo is multi-context (e.g. a monorepo): infer which context the current topic belongs to
and update that context's `CONTEXT.md`; if unclear, ask.
