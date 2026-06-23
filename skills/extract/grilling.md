# Grilling (phase 3 of extract)

The differentiating phase. You adjudicate the architecture *with* the user, turning detected
incongruities into a curated, agreed pattern. This is the same disciplined grill as a design review —
applied to "where does this code belong?".

## The core loop

> Interview the user about every architectural decision until you reach a shared understanding. Walk
> down each branch of the design tree, resolving dependencies one-by-one. For each question, provide
> your recommended answer. Ask the questions one at a time, waiting for feedback before continuing.
> Asking multiple questions at once is bewildering. If a question can be answered by reading the
> codebase, read the codebase instead.

## Sequencing rules

1. **One question at a time**, waiting for the answer before the next.
2. **Every question carries your recommended answer** — the user confirms or corrects, not authors.
3. **Codebase-first.** Anything you can settle by reading the repo, settle yourself; don't ask.
4. **Walk the tree, resolving dependencies one at a time** — don't jump branches.

## Seeding from `detect`

Each surviving incongruity (highest confidence first) becomes a grilling question:

> "You have business logic in `orders.controller.ts` *and* `orders.service.ts` — which is canonical?"
> Recommended: the service (your dominant convention puts logic in `*.service.ts`). Confirm or correct.

Present the inferred intended pattern as a **hypothesis, not an assertion**: "it looks like your
convention is X — right?" Cross lexical signals (naming) + location (folders) + the dependency graph
before you assert anything. Prioritise by the confidence/hotspot score so the user's attention goes to
what matters; park large refactors instead of diluting the session.

## The five maneuvers (during the session)

- **Challenge against the glossary.** If a term conflicts with `CONTEXT.md`, call it out: "your glossary
  defines X as A, but you mean B — which is it?"
- **Sharpen fuzzy language.** Overloaded term → propose a precise canonical one: "'handler' — do you mean
  the controller or the queue consumer?"
- **Discuss concrete scenarios.** Probe boundaries with specifics: "when you add a new microservice,
  which folders get touched?"
- **Cross-reference with code.** If a claim contradicts the code, surface it: "you said repositories never
  import controllers, but `orders.repository.ts` does — which is right?"
- **Materialise inline.** When a term resolves, update `CONTEXT.md` right there (see CONTEXT-FORMAT.md).
  Don't batch. Offer an ADR only when it's hard-to-reverse **and** surprising **and** a real trade-off
  (see ADR-FORMAT.md).

## Scope-aware grilling

If the scope is `shareable` (SKILL.md §0), add one reflex to every maneuver: when the user or the
code supplies a business term, **generalize it on the spot** — "your repo calls this `Patient`; in a
shareable pattern that's `<Entity>` — agreed?" Resolve placement in role terms so the bundle never has
to be de-business-ified afterward. See [GENERALIZATION.md](./GENERALIZATION.md). For an `internal`
pattern, concrete names are welcome — skip this reflex.

## Convergence

There is no hard question cap — too many questions is a quality problem (redundant prompts), not a count.
Stop when the placement of every significant kind of file is agreed and the bundle's `structure`/`rules`/
`recipes` can be written without guessing.
