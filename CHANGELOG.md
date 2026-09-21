# Changelog

From here on, any change to the output bytes for the same (seed, options) is a minor version with
a line here saying what changed (ADR 010).

## 0.2.0 — unreleased

- `Roulette.table(opts)` — the betting layout as an SVG string, 14:5, for a hero band the wheel
  can stand on. The real grid (12 × 3 with the zero across three rows, `american` splitting it in
  two), the canonical irregular red/black pattern, dozens, column bets and the six outside boxes.
  No digits, by the same call as the number ring (ADR 009).
- The layout paints its own felt — the brand's derived background by default, any CSS colour as a
  pin, `felt: false` for none. It is the one drawing in the library that paints a background: the
  cloth is part of the subject.
- Under `theme: 'light'` the table defaults to the `line` style: filled cells over a white page
  stop reading as the site's palette and start fighting it. An explicit `style` still wins.
- Seeded from its own `table:*` streams, so `svg()` and `mark()` are untouched: 1330 recorded
  renders across 120 seeds are byte-identical to 0.1.0 (ADR 010).
- 7580 B min+gzip against the 8192 B budget raised for `table()` (ADR 009). The README's size
  line moves with it: a number in prose goes stale the moment a feature lands, and this one
  described 0.1.0 while sitting on the branch that changes it.

## 0.1.0 — 2026-09-18

First release.

- `Roulette.svg(opts)` — a roulette wheel as an SVG string, in Node at build time or in the
  browser. `seed` spins the geometry (a number or a domain name), `brand` the colours.
- Styles `flat` (fills with volume from black/white overlays) and `line`; views `tilt` (three-
  quarter, one affine matrix) and `top`; European and American wheels.
- Colours keep the roulette's meanings — red and black pockets, a green zero, brass — and the
  brand fills them by hue (ADR 011); any role can be pinned with any CSS colour, `var()` included,
  so an inline wheel follows a page's light/dark toggle.
- Optional CSS motion — the wheel one way, the ball the other — stopped by
  `prefers-reduced-motion`; seeded names, so wheels on one page do not collide as long as their
  seeds (or, for one seed twice, their `salt`s) differ.
- `Roulette.mark(opts)` — the wheel as a logo glyph (`mono`, in `currentColor`) or a favicon
  (`badge`).
- `Roulette.palette(brand, { theme })` and `Roulette.init(el, opts)` (browser; pauses off screen).
- No signature in the output: no comments, metadata or fixed names — every id, class, keyframe and
  custom property is a seeded token.
- 38 Node tests, a browser verify page (Chromium, Firefox, WebKit), 7006 B min+gzip.
