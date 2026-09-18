---
type: decision
status: accepted
date: 2026-09-18
tags: [colour]
project: roulette-lite
---

# 011 — roulette colours by hue capture

## Context

ADR 004 mapped the wheel's roles onto hexagons' palette by distance from the background: the red
pockets were a stop of the brand's first hue, the zero took the accent. It rendered a wheel in
the brand's colours — and not a roulette. The user saw it at the M2 checkpoint: the spintax triad
has three colours, one of them a crimson right next to casino red, and the wheel used two of them;
the crimson only tinted the near-white ball, and there was no green zero at all.

## Decision

The roulette meanings stay; the brand fills them. Each chromatic brand colour takes the role
nearest its hue — red pockets (28° ±40°), the green zero (145° ±40°), brass (85° ±25°), in that
order, each colour once. A role nobody took gets its classic hue in the brand's key. Black is
always derived, never a brand colour. The body is the first colour no role took, through
`derive()` unchanged; with none left, the brand's hue as wood (0.45× chroma). Numbers in the spec.

Prototyped outside the library first (pins carry the proposed colours) on seven brands — the
triad, single blue, terracotta, green, violet, grey, and a two-colour brand — in both themes, and
chosen by the user over two alternatives: classic hues always (the triad's crimson unused again),
and capture plus the old monochrome look as a `pockets: 'brand'` option (more code for a look
nobody asked for).

## Consequences

- Every wheel reads as a roulette whatever the brand; every brand colour given is used.
- ADR 004's role table is superseded; its port of `derive()` stands, and `Roulette.palette(b)`
  still matches `Hexagons.palette(b)` where the body is the brand's first colour.
- Output bytes for the same (seed, brand) change — before any release, so no version bump is due
  (ADR 010 starts at 0.1.0).

## Addendum — 2026-09-18: nearest pair, the bowl, grey (Codex review)

An external review (Codex) found two gaps between the rule and the code. The capture ran role by
role — red, then green, then brass — so a colour inside two windows went to the first, not the
nearest: amber (H 64°) became the red pockets though brass was 15° nearer. And "every brand colour
is used" was false: a second leftover colour and any grey colour were dropped. Now every (colour,
role) pair inside a window is a candidate and the nearest are settled first; a second leftover
colour takes the bowl (track and cone); a grey colour is the body when no chromatic one is left,
before falling back to wood. Tests pin each case, and that any two colours from a pool of eight
both appear in the wheel. Two more rounds of the same review sharpened the grey: next to a
chromatic body a grey is the chrome when no colour took the brass, else the bowl — so grey, blue
and violet use all three.
