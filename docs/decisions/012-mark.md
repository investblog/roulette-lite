---
type: decision
status: accepted
date: 2026-09-18
tags: [api, mark]
project: roulette-lite
---

# 012 — `mark()`: the wheel as a logo glyph and a favicon

## Context

A site that draws its hero wheel from its own seed still ships a stock favicon and a stock glyph
beside its name — the same ones as every other site built from the same template. The user asked
whether the wheel could make those too: a mark from the same seed, so a site's logo, favicon and
hero wheel are one family, and each site's are its own.

## Decision

`Roulette.mark(opts)`: the wheel reduced to what reads at 16–64 px — rim, one ring of 8/10/12/16
alternating segments, a hub (dot, ring or diamond), optionally the crosshead's bars; top view,
64×64. Seeded from streams of its own, so `svg()` output is untouched. `mono` draws in
`currentColor` for a logo; colour takes the wheel's roles; `badge` adds a seeded backplate
(circle or rounded square) for a favicon. No ids, defs or style.

Prototyped outside the library first, on four brands at 16, 24, 32 and 64 px — favicon, colour
mark and mono logo — and chosen by the user over drawing the mark in the consumer only (which
would have kept it out of reach of other projects). The logo is mono by the user's call.

## Consequences

- The size budget is raised for it (ADR 009 addendum).
- The same (seed, options) gives the same bytes, as for `svg()` (ADR 010).
