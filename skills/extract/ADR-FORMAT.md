# ADR format

Architecture Decision Records capture the *why* behind the pattern's shape. The grill writes them into
the bundle's `adrs/` section as decisions crystallise.

## Template

```md
# {Short title of the decision}

{1-3 sentences: the context, what was decided, and why.}
```

That's it — an ADR can be a single paragraph. The value is recording *that* a decision was made and
*why*, not filling out sections. Add a `## Status` (`accepted` | `superseded by NNNN`) only when
decisions get revisited.

## Numbering

`adrs/0001-slug.md`, `0002-slug.md`, … Scan the `adrs/` directory for the highest number and increment.
Create it lazily — only when the first ADR is needed.

## Offer an ADR only when all three are true

1. **Hard to reverse** — changing your mind later is costly.
2. **Surprising without context** — a future reader will wonder "why on earth did they do it this way?"
3. **A real trade-off** — there were genuine alternatives and one was chosen for specific reasons.

If a decision is easy to reverse, not surprising, or had no alternative, skip it.

### What qualifies

Architectural shape (monorepo, layering, messaging-vs-HTTP between modules); technology choices with
lock-in (DB, message bus, auth); boundary/scope decisions ("X owns this data; others reference by ID");
**deliberate deviations from the obvious path** (these stop the next engineer from "fixing" something
intentional); and rejected alternatives whose rejection is non-obvious.
