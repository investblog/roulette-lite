---
type: decision
status: accepted
date: 2026-09-18
tags: [motion, accessibility]
project: roulette-lite
---

# 006 — motion through CSS inside the SVG

## Context

The user wants static art with optional motion. SMIL animates without script but cannot be gated by `prefers-reduced-motion` without JavaScript; a JS loop would put a script on the page, which ADR 002 exists to avoid.

## Decision

Motion is an optional `<style>` inside the SVG: one seeded `@keyframes` (rotate 360°), classes on the rotor and ball groups, and `@media (prefers-reduced-motion: reduce)` sets `animation: none`. Off by default. Animated elements never carry a `transform` attribute (CSS would replace it). No type or universal selectors — an inline `<style>` in HTML is document-global.

## Consequences

- `init()` pauses off-screen wheels through a seeded custom property and an IntersectionObserver.
- Chrome repaints the rotor region every frame (SVG transforms are not composited): measured before motion is recommended.
