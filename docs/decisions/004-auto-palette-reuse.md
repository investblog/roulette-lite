---
type: decision
status: accepted
date: 2026-09-18
tags: [colour]
project: roulette-lite
---

# 004 — reuse the hexagons auto-palette

## Context

hexagons derives a whole palette from one brand hex in CIE LCh (chroma-only gamut mapping, contrast floors, graphite for achromatic brands). A wheel needs more roles than a honeycomb — two pocket colours, a zero, metal, a ball.

## Decision

Port `derive()` and its helpers unchanged (hexagons.js:89–206), so `Roulette.palette(b)` extends `Hexagons.palette(b)` instead of disagreeing with it. Add two derived roles — `pocketB` lch(16, min(C·.25, 12), H) and `metal` lch(84/36, accC·.6, accH) — and map the rest by distance from the background (spec table). Every role can be pinned with any CSS string; the renderer never parses a pinned value, only escapes it. Default brand: the spintax triad.

## Consequences

- A future sibling on the same engine inherits the same colours for the same brand.
- Contrast guards cover derived colours only; a pinned `var()` is the caller's responsibility (documented).

## Addendum — 2026-09-18: role table superseded by ADR 011

The mapping of roles by distance from the background is replaced by capture by hue (ADR 011). The
port of `derive()` stands unchanged and still feeds the body.
