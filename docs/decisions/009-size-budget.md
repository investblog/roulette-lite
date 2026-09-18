---
type: decision
status: accepted
date: 2026-09-18
tags: [size]
project: roulette-lite
---

# 009 — size budget and how it is measured

## Context

The siblings sit between 3.3 and 6.9 KB gzip. A `gzip -9 -c | wc -c` pipeline stores the file name in its header and drifts between machines.

## Decision

`scripts/size.mjs` (hexagons'): terser in process with compress + mangle, then Node `gzipSync` at level 9; prints the byte count and exits 1 above `package.json` `config.sizeBudget`. Provisional budget 5120 B from M1; at the end of M3 it is frozen at the measured size plus a small margin, and the history is recorded here as an addendum.

## Consequences

- Trims are kept only if `npm run size` shows them (gzip beats clever — inherited lesson).

## Addendum — 2026-09-18: the M1 size spike

Measured at the end of M1: **4019 B** gzip for top view + line style + palette. Split by
removing code and re-measuring: the palette with the wheel's roles is ~1.37 KB, drawing with
seeds and markup helpers ~2.65 KB. Still to come, estimated: flat style (fills, overlays, the
aperture clip, gloss gradient, grain) +0.8–1.0 KB; tilt (matrix, extrusions, per-layer shifts,
culling, framing) +0.6–0.8 KB; motion CSS +0.3–0.4 KB; `init()`/`set()` with the off-screen pause
+0.4–0.5 KB; the number table +0.3 KB. **Forecast: ~6.4–7.0 KB** — hexagons' class (6868 B), not
the provisional 5120 B. The gate stays provisional until M3 as decided; the user was told the
forecast at the M1 checkpoint, with the cheapest cuts if they want a smaller number: `init()` and
`set()` (a build-time user needs neither), `glow`, the three crosshead
styles, digits.

## Addendum — 2026-09-18: M2 measured, provisional budget raised to 7168 B

Flat style and the tilted view measured **5.4–5.5 KB** — inside the M1 forecast. The provisional
5120 B would fail every run from here to the freeze, which trains everyone to ignore the gate. It
is raised to **7168 B**, the forecast's upper bound, and still frozen at measured + margin after M3.

## Addendum — 2026-09-18: frozen after M3 at 6656 B

Measured with motion and `init()`: **6438 B**. Frozen at **6656 B** (6.5 KiB, +3.4%) — room for
M4's fixes, not for features. The one feature still pending, digits on the number ring (~0.3 KB),
was moved out of v0.1 instead of being budgeted: a hero illustration rarely wants it, and it
would put identical visible text on every page that did. History: provisional 5120 (M0), raised to
7168 at M2 on the M1 forecast, frozen here.

## Addendum — 2026-09-18: raised to 7168 B for mark()

`mark()` (ADR 012) measured +427 B: **7006 B**. The budget moves from 6656 to **7168 B** (7 KiB),
the user having chosen the mark in the library over the mark in the consumer knowing it would
cost the freeze. The rule stands: this is room for fixes, not for the next feature — the next one
raises it again, on the record, or does not come.
