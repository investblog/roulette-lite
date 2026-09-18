# Changelog

From here on, any change to the output bytes for the same (seed, options) is a minor version with
a line here saying what changed (ADR 010).

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
