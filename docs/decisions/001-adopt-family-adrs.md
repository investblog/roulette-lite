---
type: decision
status: accepted
date: 2026-09-18
tags: [process, release]
project: roulette-lite
---

# 001 — adopt the family ADRs

## Context

roulette-lite is the fourth library in `C:\projects\libs`. Its siblings already paid for a set of decisions that are about the kind of project, not about the drawing: octagons 003 (OIDC trusted publishing after a one-time token bootstrap), trigons 001 (the minified file is generated, never committed), trigons 002 (author 301ST), and hexagons' contract-first spec.

## Decision

Adopt them as they stand:

- `roulette.min.js` is built by `npm run build` and gitignored; `prepack` builds it.
- Publishing goes through OIDC trusted publishing with provenance, after the house one-time token bootstrap — the token is created and pasted by the user, never by an agent, and deleted the same day.
- `author: "301st (https://301.st)"`, MIT © 301ST.
- `docs/README.md` is the contract: the doc changes before the code.

Not adopted: octagons 002 (`step(dt)` instead of render) — there is no animation loop here; motion is CSS (ADR 006).

## Consequences

- RELEASING.md follows hexagons' (the fullest), including the idempotent skip when a version is already published.
- The stale-status incident (hexagons' spec said "Status: SPEC" after shipping) is guarded by a status line updated at every milestone.
