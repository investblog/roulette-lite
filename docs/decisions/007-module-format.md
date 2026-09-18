---
type: decision
status: accepted
date: 2026-09-18
tags: [packaging]
project: roulette-lite
---

# 007 — module format: ES5 IIFE with a UMD tail

## Context

Siblings are browser globals only. This library must also be importable at build time from Node ESM (Astro/Vite SSR) — without a build step for an ESM variant, and without breaking the `<script>` path.

## Decision

`roulette.js` is ES5, wrapped `(function (root, factory) { … })`: under CommonJS it sets `module.exports = api`, otherwise `root.Roulette = api`. `package.json`: `main: roulette.js`, `types: roulette.d.ts` (hand-written, `export = Roulette`), `files: [roulette.js, roulette.min.js, roulette.d.ts, CHANGELOG.md]`, no `type`, no `exports` (it would block deep imports of `roulette.min.js`).

## Consequences

- Only the default import is documented: Node cannot detect named exports on an object assigned in one piece to `module.exports`.
- Proven by a Node ESM test, a CI pack-and-install smoke (ESM + require), verify.html via `<script>`, and the consumer's `pnpm build`.

## Addendum — 2026-09-18: ES5 is the syntax, not the runtime

An external review (Codex) noted that the seeds use `Math.imul`, which is ES2015, while the docs
said "ES5". The siblings do the same. The claim is corrected rather than the code: ES5 syntax, so
old tooling parses it; the runtime is anything with `Math.imul` — current browsers and supported
Node releases (CI runs 22 and 24). A polyfill would buy engines nobody targets.
