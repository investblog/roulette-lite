---
type: decision
status: accepted
date: 2026-09-18
tags: [architecture]
project: roulette-lite
---

# 002 — an SVG string, not a canvas

## Context

The siblings are canvas animations that need a browser and a script on the page. This one is meant for static sites built with Astro and the like: the art must exist in the HTML the build writes, with no JavaScript shipped to the reader, and it must follow the site's light/dark toggle.

## Decision

`Roulette.svg(opts)` is a pure function returning an SVG string. It touches no DOM, so it runs in Node at build time and in the browser alike. `init()` is a thin browser convenience that inserts that string; it is not a renderer.

## Consequences

- Motion, when wanted, lives in the SVG as CSS (ADR 006), not in a loop.
- Colours can be CSS strings, including `var()`, so an inline wheel follows page CSS (spec: Colour).
- Nothing canvas-specific is ported from the siblings; only the palette and the RNG.
