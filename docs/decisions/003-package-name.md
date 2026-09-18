---
type: decision
status: accepted
date: 2026-09-18
tags: [naming, release]
project: roulette-lite
---

# 003 — package name: `roulette-lite`

## Context

The user's call (2026-09-18). npm `roulette` is taken (0.0.0, "switch dom elements position"); `roulette-lite` returned E404 the same day, and `investblog/roulette-lite` did not exist on GitHub.

## Decision

Package `roulette-lite`, global `Roulette`, repo `investblog/roulette-lite` (repo = package name, the house style fixed in hexagons 003), source `roulette.js`, generated `roulette.min.js`, types `roulette.d.ts`.

## Consequences

- The name-squatting window opens when the repo goes public; the plan makes the repo public the same day as the first publish (M6), after the local integration has shown the wheel is worth it.
