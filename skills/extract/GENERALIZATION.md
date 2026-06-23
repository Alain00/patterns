# Generalization (the shareable contract)

A pattern has a **scope** (set in [SKILL.md](./SKILL.md) §0):

- **`internal`** — a house pattern. Domain-rich is *good*: concrete names help one codebase stay
  consistent. Nothing below applies; write it the way the repo actually reads.
- **`shareable`** — the architecture as an agnostic layer. This file is its contract: a `shareable`
  bundle must read as if it were written by someone with no knowledge of this company's domain.

The test for every sentence you write in a `shareable` bundle:

> **Could a team in a completely different domain adopt this verbatim?** If a sentence only makes
> sense once you know what this company *sells*, it is business logic — generalize it.

## Three operations

### 1. SCRUB — remove outright

- Company / product / team names (`ZentrumCare`, `Vlue`, `the billing squad`).
- Concrete external services and vendors by name when they are incidental (`our Stripe webhook`,
  `the Salesforce sync`) — keep the *role* ("a payment provider webhook") if it is architectural.
- Environment, secret, queue, and table names that encode the business (`patients_v2`, `ORDER_TOPIC`).
- Anything that reads like a changelog, a person, a ticket, or a deadline.

### 2. RENAME TO ROLE — replace the concrete with the structural

| Business-specific (internal)         | Agnostic (shareable)                         |
| ------------------------------------ | -------------------------------------------- |
| `Order`, `Patient`, `Invoice`        | `<Entity>` / `<Aggregate>`                    |
| `OrdersService`, `PatientRepository` | `<Entity>Service`, `<Entity>Repository`      |
| `orders/`, `appointments/`           | `<feature>/` (a feature/bounded-context dir) |
| "when a patient books a visit"       | "when a user performs a use-case"            |
| "the ZentrumCare patient flow"       | "the primary read path"                      |

Recipes become **templates**: "to add a `<feature>`, create `<feature>/<feature>.controller.ts`,
`<feature>/<feature>.service.ts`, …" — placeholders, not instances.

### 3. KEEP — this *is* the architecture

- Architectural layer names: `domain`, `application`, `infrastructure`, `adapters`, `ports`,
  `controllers`, `usecases`, `repositories`. These are roles, not business.
- The stack (`node`, `nestjs`, `postgres`) and file-naming conventions (`*.service.ts`, `*.dto.ts`).
- Dependency and import rules, and the `boundaries:` globs — generalize their *feature* segments
  (`packages/billing/** → …` becomes `packages/<feature>/** → …`) but keep their *layer* segments.
- The principles, the trade-offs, and the *why* in ADRs (an ADR's reasoning is usually already
  domain-free; if it names an entity, swap it for a role).

## Per-section checklist

- **`patterns.yaml`** — the file the registry indexes and surfaces publicly, so scrub it hardest:
  `name` and `description` in role terms, and every rich-index summary (`is` / `enforces` / `when` /
  `decides`) plus each `boundaries[].why` stated over layers and roles, never named entities or modules.
- **`structure/`** — describes roles and where they live, never which entities exist.
- **`rules/`** — placement/import rules stated over layers and file kinds, never over named modules.
- **`recipes/`** — templates with `<placeholders>`; no "add the Patient endpoint" walkthroughs.
- **`adrs/`** — keep the decision and rationale; strip entity names from the prose.
- **`README.md` / `AGENTS.md`** — what the architecture *is* and when to use it, in role terms.
- **`CONTEXT.md`** — the glossary is inherently domain-specific. It stays **local** to the repo; a
  `shareable` bundle does **not** ship it. (If you want a glossary in the bundle, it must define
  *roles*, not the repo's entities.)

## Generalizing an existing internal pattern

You are not locked into the scope you chose. To turn a house pattern into a shareable one:

1. Point this skill at the existing `internal` bundle (read it the way you would read a repo).
2. Apply the three operations above to every doc.
3. Set `scope: shareable` and `emit` a **new** bundle (don't overwrite the internal one — they serve
   different audiences and both can be worth keeping).

The internal bundle remains the richer source of truth; the shareable bundle is provably it, minus
the business.
