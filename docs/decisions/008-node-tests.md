---
type: decision
status: accepted
date: 2026-09-18
tags: [testing]
project: roulette-lite
---

# 008 — Node tests alongside the manual verify page

## Context

Siblings verify by a manual browser page only, and the user has declined test-runner dependencies before. This library's core is a pure function with contracts (determinism, independence, no signature) that a browser page checks poorly and a machine checks well.

## Decision

`node --test` — built into Node, so no new dependency — for determinism, brand/seed independence, no-signature output, well-formed SVG, CSS-var pass-through, motion gating, the pocket-order table, and the module import. `test/verify.html` stays for what needs a browser (DOMParser, computed `var()` colours, two wheels on one page) and `index.html` for looking.

## Consequences

- CI runs lint, build, test, the size gate, the tarball contents and the consumer smoke on Node 22 and 24.
- The git pre-push gate runs `npm test` too.
