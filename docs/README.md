---
type: note
status: active
tags: [architecture, overview, spec]
project: roulette-lite
---

# roulette-lite — spec / dev source of truth

Docs for developers and agents. `index.html` is the verification surface, `test/` the gate.
Contract-first: change the doc here **before** the code, then code.

**Status (2026-09-20): v0.1.0 built and tagged-ready, not yet on npm** — the bootstrap publish
is held by an npm account freeze until 2026-09-21 17:46 UTC (RELEASING.md, the fourth failure
mode). `table()` is in progress for 0.2.0 on `feat/table`. This line is kept true at every
milestone; a spec that still says "SPEC" after shipping (hexagons) is the thing it guards against
— and one that claims a release it has not made is the same fault pointing the other way.

## The pitch, in one paragraph

A roulette wheel drawn by code. One call returns an SVG string — in Node at build time or in the
browser — so a static site gets its hero art with no script on the page. Two knobs span the
variant space: **`seed`** spins the geometry (a number or a domain name, one wheel —
reproducibly), **`brand`** spins the colours (one hex, the whole palette). Two styles behind one
knob — `line` art like its siblings, or `flat` fills with volume — two views, `top` and a `tilt`
in three-quarter perspective, and an optional CSS spin that stops for readers who asked for less
motion. Zero dependencies, a few KB.

## The load-bearing idea

Everything is drawn in the **wheel plane** — flat coordinates, outer rim radius `R = 1000`, +y
toward the viewer — using only circles and circular arcs. One affine map turns the plane into
the picture:

```
screen = P · (x, y − z·tanθ)        P = Rot(ρ) · diag(1, cosθ)
emitted once as  matrix(cosρ  sinρ  −sinρ·cosθ  cosρ·cosθ  0  0)
```

- θ is the **tilt** (0 = seen from above), ρ the **roll** of the whole picture.
- **Height** is a shift along plane-y: a part at height `z` is drawn at `y − z·tanθ`. Static
  circles get it as their `cy`; spinning layers sit under `translate(0 −z·tanθ)`.
- **Spin** is a rotation of an inner group about its own (0,0) — in plane space, *inside* the
  projection, so the wheel turns like a wheel and not like a sticker.
- **`view: 'top'` is the same code with θ = 0.** The side band vanishes, the turret collapses to
  circles. There is no second renderer.

### Anatomy (radii ×R, heights ×R)

| Part | Radii | Height z | Spins |
|---|---|---|---|
| Rim side band | 1.00 | 0 → H, H ∈ [0.12, 0.18] | — |
| Rim top (wood) | 1.00 → r1, r1 ∈ [0.84, 0.88] | H | — |
| Inner wall | r1 | H → H−0.03 | — |
| Ball track | r1 → r2 = r1−0.10 | H−0.03 → H−0.06 | — |
| Stator slope + deflectors at (r2+r3)/2 | r2 → r3 = r2−0.08 | → z3 = H−0.10 | — |
| Number ring (detail ≥ 2) | r3 → r4 = r3−0.06 | z3 | yes |
| Pocket ring + frets | r4 → r5 = r4−0.12 | z3−0.01 | yes |
| Cone | r5 → 0.12 | rises c ∈ [0.05, 0.08] | inlays only |
| Turret column | rt ∈ [0.045, 0.065] | cone top → +h, h ∈ [0.08, 0.14] | — |
| Crosshead: 4 arms to a ∈ [0.18, 0.26], knobs 0.03 | — | turret top | yes |
| Ball | 0.026 | track, radius (r1+r2)/2 | orbits |

At maximum tilt the near side of the pocket ring stays visible: it needs
(r1−r4) > (H−z3)·tanθ, and it holds by construction — H−z3 is 0.10R and r1−r4 is at least 0.21R,
so any θ below 64.5° keeps it, and `tilt` is clamped to 60°.

### Pockets without sector paths

A pocket ring is one `<circle>` whose `stroke-width` is the ring's width, with a
`stroke-dasharray`. With `N` pockets and `L = 2πr/N`:

| Layer | Dasharray | Offset |
|---|---|---|
| pocketB | full ring (no dash) | — |
| pocketA | `L L` | European `L`, American `0` |
| zero | European `L (N−1)L`; American `L 18L` (zeros at 0 and 19) | 0 |
| frets | `f (L−f)` | `f/2` |

European `N = 37`: zero at k = 0, pocketA where k is odd. American `N = 38`: zeros at k = 0 and
k = 19, pocketA where k is even. All 37 pockets cost ~250 bytes instead of ~2.6 KB of sector
paths. Seams at pocket boundaries are a visual check, not an assumption.

**Numbers are not in v0.1.** At hero size they are about 8 px, they bring a font dependency and
~0.3 KB of code, and they would put visible identical text on every page that uses them — and a
hero illustration rarely wants them. Moved to the backlog when the size budget was frozen
after M3; `detail: 3` is reserved for them and draws as `detail: 2` until then.

### Tilted view: extrusion, clip, order, culling

- **`ext(r, yTop, yBot)`** = `M −r,yTop L −r,yBot A r r 0 0 0 r,yBot L r,yTop` — the side of a
  cylinder. The rim uses it downward, the turret upward. Flat style fills it (closes
  implicitly) and draws the top circle over it; line style strokes it **open**, which is exactly
  the near half-arc plus the two silhouettes. Exact at any tilt and roll, because the tangent
  points are always x = ±r in plane space.
- **One aperture clip** — the circle (r1, cy = −H·tanθ) — hides the near inner wall, the near
  track and the ball passing behind the near rim.
- **Painter's order (flat):** side band → rim top → aperture disc → [inside the clip: track →
  slope → deflectors → rotor rings → static gloss → cone → ball] → turret → crosshead → finial.
- **Line-art culling** (sibling rule: line art has no hidden-surface removal): the aperture
  clip, open `ext` paths, the turret flange drawn as its far arc only, crosshead arms starting
  at 1.2× the finial radius. Nothing else overlaps below 58°, so `tilt` is clamped to ≤ 60°.
- **The ball stays round:** `orbit(rotate) › rotate(β0) › translate(rb 0) › counter-orbit ›
  rotate(−β0) matrix(P⁻¹)` — the rotations cancel and P·P⁻¹ = I, so its highlight stays fixed
  on screen.

## Styles

| | `line` | `flat` |
|---|---|---|
| Rim | open `ext`, top circle, lip circle | `ext` filled + black .28 overlay; top disc; white .12 lip; wall black .45 |
| Bowl | track, slope, rotor circles (clipped) | discs; track white .20, slope white .08; pocket floor black .20 |
| Pockets | pocketA and zero as a band half the ring's width (narrower read as a ruler, not a wheel) | dash rings A / B / zero |
| Frets | dash circle at 0.6× weight | dash circle, metal |
| Cone / turret | circles, `ext` | three terraces climbing to the turret, white .10 and .20; turret side black .25, top white .20 |
| Grain | — | 2–4 rim rings, α .05–.08 |

- **Volume comes from black/white opacity overlays, never from colour maths.** That is what lets
  a pinned `var(--primary)` base still get shading. The first flat render took the spec's first
  numbers (track +.06, slope −.15) and the track came out the rim's own tone — the ball read as
  lying on the rim. The track now lifts by .20 and the slope by .08, so rim, track, slope and cone
  are four readable surfaces.
- **Light** is fixed in screen space, upper-left, converted once to a plane angle. The rotor gloss
  is a static gradient above the spinning group, so highlights never spin.
- **Line weight** = 6 units × `weight`, in three tiers: the rim and the pocket ring carry the
  drawing (1.6× and 1×), the bands between them only divide it (0.55×). Seven circles of one weight
  had no hierarchy at all. Each tier is one group so the glow can reuse it — a `<use>` of the group
  at 3.5× width and .14 opacity, on the two heavy tiers only; no filters (siblings measured filters
  as the frame-rate killer).
- **No black outlines** in flat: the reference clipart's cartoon outline is exactly what this
  library does not draw.

## Colour — roulette colours from the brand

A roulette wheel is read by its colours before its shape: red and black alternating, one green
zero, brass. The palette keeps those meanings and lets the brand fill them (ADR 011).

**Capture by hue.** Every chromatic brand colour (LCh chroma ≥ 12) takes the role nearest its
hue. Each (colour, role) pair whose hue distance is inside the role's window is a candidate; the
nearest pairs are settled first, each colour and each role at most once (ties: colour order, then
role order). So amber `#d97706` (H 64°), inside both the red and the brass window, goes to brass,
which is 21° away, rather than red, 36° away:

| Role | Target hue (LCh ab) | Window | Captured colour keeps | Otherwise — the classic hue in the brand's key |
|---|---|---|---|---|
| `pocketA` — red | 28° (casino red) | ±40° | its hue and chroma, L 46 | lch(46, clamp(bodyC·1.2, 50, 75), 28) |
| `zero` — green | 145° | ±40° | its hue and chroma, L 50 | lch(50, clamp(bodyC, 35, 60), 145) |
| `metal` — brass | 85° | ±25° | its hue, chroma ×0.8; L 78 dark / 40 light | lch(78 / 40, 35, 85); chrome (C 0) for a grey brand |

- **Black is never a brand colour:** `pocketB` = lch(14, min(bodyC·0.15, 6), bodyH), both themes —
  the constant that makes the alternation read.
- **The body** (rim and the line-style stroke ramp) is the first brand colour no role took, run
  through hexagons' `derive()` unchanged — CIE LCh, chroma-only gamut mapping, contrast floors.
  **The bowl** (track and cone) is the second colour left over, or the body again. A **grey**
  brand colour (the first one; greys count as one colour) is the body when no chromatic colour is
  left, with chrome metal; otherwise it is the **chrome** if no colour took the brass, else the
  bowl if that is still free. Failing all of that — a red or a green brand — the body is **wood in
  the brand's hue**: the first colour at 0.45× its chroma. So every colour given is used as long as
  it has a place: a chromatic colour has five (three roles, body, bowl), a grey three (body,
  chrome, bowl). Colours beyond that, and a second grey, are ignored.
- **The spintax triad** uses all three: crimson `#a91455` (H 3°) → red pockets, gold `#d6af3c`
  (H 88°) → brass, blue `#00abf3` → the body; the zero takes the classic green.
- Guards (derived colours only): red and zero ≥ 2.5 against black, metal ≥ 3 against black (L
  repaired upward); the ball is `hot`, ≥ 3 against the track.
- Where the body is the brand's first colour, `Roulette.palette(b)`'s stroke ramp, background and
  halo equal `Hexagons.palette(b)` (a fixture test pins it). Where it is wood, they differ on purpose.
  `background` and `halo` are returned for the page to use; the wheel never paints them.

- **Pins win.** Any role accepts **any CSS colour string** — hex, `rgb()`, `var(--x, #fallback)`.
  The renderer never parses a pinned value; it only escapes `" < > &`. `'auto'` unpins.
- A pinned `var()` cannot be contrast-checked (the site's real background is unknown); the guards
  apply to derived values. The recipe for following a site's light/dark toggle: derive the roles
  per theme at build time, publish them as the site's own custom properties, pin every role to
  `var()` of them. Works for inline SVG only — an `<img>` does not see page CSS.
- **`var()` works as a presentation attribute** — checked 2026-09-18 in Chromium, Firefox 155 and
  WebKit 26.6, by counting painted pixels, not by reading computed style: a pinned `var()` paints on
  a circle's `stroke`, a circle's `fill`, a path's `stroke`, and through `<use>` inheritance, with
  near-identical pixel counts in all three. So every colour stays a presentation attribute — which
  also keeps the art working under a CSP that forbids inline `style` attributes.

## Motion

Off by default. `motion: true | 'rotor' | 'ball'`; `speed` divides the periods, and `0` turns
motion off.

```
<g transform="translate(0 −z·tanθ)"><g class="$r"><g transform="rotate(φ0)">rotor…
.$r{animation:$k 64s linear infinite;transform-origin:0 0;animation-play-state:var(--$p,running)}
@keyframes $k{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.$r,.$b,.$q{animation:none}}
```

- **CSS, not SMIL:** `prefers-reduced-motion` cannot gate SMIL without script.
- **An animated element never carries a `transform` attribute** — CSS `transform` would replace
  it. Phase lives on a child.
- One keyframe serves every group; the rotor (48–80 s) and the ball (12–22 s) run in opposite
  directions, the direction and both periods seeded; rotor rings and crosshead share a class so
  they stay in step.
- **The ball** is a chain: `translate(0 −zT·tanθ)` › orbit class › `rotate(β0) translate(rb 0)` ›
  counter-orbit class › `rotate(−β0) matrix(P⁻¹)` › circle. Orbit and counter-orbit share a period
  and run opposite ways, so they cancel exactly and the ball stays round with a fixed highlight.
  Without motion the same chain collapses into one `transform`.
- **Motion names come from their own token stream**, so switching motion on renames nothing in the
  static picture (a test pins the ids).
- **An inline `<style>` is document-global.** Every class, keyframe and custom-property name is a
  seeded token; there are no type or universal selectors.
- `init()` pauses a wheel off screen by setting its seeded `--$p` to `paused` through an
  IntersectionObserver — the sibling rule "a background library sleeps off screen", with no
  animation loop to stop.
- Checked 2026-09-18 in Chromium, Firefox 155 and WebKit 26.6: the crosshead's four knobs keep
  their common centre to the pixel while turning (transform-origin `0 0` is the local origin inside
  the nested groups and the view matrix); the ball runs round and stays round (≤ 0.1% error);
  with reduced motion emulated there are no animations at all; `init()` pauses off screen, resumes
  on return, and still pauses after a `set()` renamed the pause variable. One 640 px wheel held
  60 fps in headless Chromium — Chrome does not composite SVG transforms, so the rotor repaints
  every frame; worth a look on a slow phone before motion is on by default anywhere.

## Mark — the wheel as an emblem

`Roulette.mark(opts)` returns the same subject drawn for 16–64 px: a logo glyph beside a site's
name, or its favicon. At those sizes 37 pockets are noise, so the mark is the wheel reduced to
what still reads: a rim, one ring of 8, 10, 12 or 16 alternating segments, a hub (dot, ring or
diamond), and sometimes the crosshead's two bars — seen from above, `viewBox="0 0 64 64"`.

- **Seeded like the wheel, from streams of its own** (`mark:*` keys), so a site's mark and its
  hero wheel come from one seed without either moving the other, and adding `mark()` changed no
  byte of `svg()` (checked against 201 recorded outputs).
- **`mono: true`** draws everything in `currentColor` — the logo, which follows the page's text
  colour, hover and theme; pockets are the marked segments, the rest is empty.
- **Colour** takes the same roles as the wheel (`palette()`, hue capture, pins accepted): red and
  black segments, one zero, brass hub and bars.
- **`badge: true`** puts it on a backplate in the body colour — a circle or a rounded square,
  seeded — which is what a favicon needs on both light and dark tab strips.
- **No ids, no defs, no style** — a mark is a handful of circles and one path, so there is nothing
  to collide when several sit on one page, and nothing to sign.

| Option | Default | What |
|---|---|---|
| `seed`, `brand`, `theme` | as `svg()` | |
| `mono` | `false` | everything `currentColor` |
| `badge` | `false` | a backplate in the body colour |
| `pocketA` `pocketB` `zero` `rim` `metal` | `'auto'` | any CSS colour, as in `svg()` |
| `size` | — | width/height; otherwise viewBox only |
| `title` | — | as in `svg()` |

## Table — the betting layout

`Roulette.table(opts)` draws the other half of the subject: the baize layout the wheel sits
beside. A page-width band (viewBox `0 0 1400 500`, 14 cells × 5), from the same roles, for a hero
background the wheel can sit on or beside. Adding it moves no byte of `svg()` or `mark()` — the
recorded outputs are the proof, as they were for `mark()`.

- **The grid is the real one.** 12 columns × 3 rows, `n = 3·col + (3 − row)`, so the top row runs
  3, 6, 9 … 36 and the bottom 1, 4, 7 … 34. A zero cell spans the three rows on the left;
  `american` splits it into 0 and 00. Right of the grid, three column-bet boxes; under it three
  dozens; under those six outside boxes.
- **Red and black keep the wheel's irregular pattern**, never a checkerboard:
  `red = (n < 11 || (n > 18 && n < 29)) ? n is odd : n is even` — 1, 3, 5, 7, 9, 12, 14, 16, 18,
  19 … A regular alternation is the one thing that would read as a chessboard instead of a
  roulette table, and it is what makes the layout recognisable with no digits on it.
- **No digits** — the same call as the number ring (ADR 009): a font dependency, ~8 px glyphs at
  hero size, and identical visible text on every page that used it. The layout is read by its
  proportions and its red/black pattern.
- **The felt is painted here**, unlike the wheel, which never paints its background: the cloth is
  part of the subject, not the page behind it. It defaults to the brand's derived `background` —
  the calm choice that never fights the wheel — and takes a pin like any role
  (`felt: '#0a3d2c'` for classic baize, `felt: false` for none).
- **Styles mirror `svg()`**: `flat` fills each cell and rules the grid in `metal`; `line` marks
  the red cells and the zero and leaves the rest to the metal rule — pocketB outlines would vanish
  into a dark felt, and the wheel's own line style colours only the red and the zero too.
- **A light theme defaults to `line`.** Filled cells over a white page stop reading as the site's
  palette and start fighting it — the wheel taught this first, where dark took either style and
  white took only contours. A table is a far larger area of flat colour than a wheel, so the
  default follows the theme; an explicit `style` always wins.
- **Seeded from its own `table:*` streams** — corner radius, the mark in the RED/BLACK boxes, the
  grid weight tier. One seed draws a wheel and its matching table, and neither moves the other.
- **No ids, no defs, no style** — as with `mark()`, so any number of tables and wheels share a
  page without collision, and there is nothing to sign (ADR 005).
- **`view: 'tilt'` is reserved** and draws as `top`: the wheel's projection matrix would carry the
  layout for the price of one attribute, but it needs a framing pass of its own, and the size
  budget gets the deciding vote (ADR 009).

| Option | Default | What |
|---|---|---|
| `seed`, `brand`, `theme` | as `svg()` | |
| `variant` | `'european'` | `'european'` \| `'american'` \| `'auto'` (seeded) — one zero cell or two |
| `style` | `'flat'`; `'line'` under `theme: 'light'` | `'line'` \| `'flat'` |
| `felt` | `'auto'` | the cloth: any CSS colour, or `false` for none |
| `pocketA pocketB zero metal` | `'auto'` | any CSS colour, as in `svg()` |
| `weight` | `1` | grid line multiplier |
| `view` | `'top'` | `'tilt'` reserved (draws as `top`) |
| `size` | — | width; height follows the 14:5 viewBox |
| `title` | — | as in `svg()` |

## Options

| Option | Default | What |
|---|---|---|
| `seed` | `1` | a string (a domain name is fine), or a number taken as a 32-bit unsigned integer — `1`, `1.5` and `4294967297` are the same wheel |
| `brand` | spintax triad `['#00abf3','#d6af3c','#a91455']` | hex or hex[] |
| `theme` | `'dark'` | `'dark'` \| `'light'` — derived colours only |
| `style` | `'flat'` | `'line'` \| `'flat'` |
| `view` | `'tilt'` | `'top'` \| `'tilt'` |
| `variant` | `'european'` | `'european'` \| `'american'` \| `'auto'` (seeded) |
| `detail` | `2` | 1 silhouette · 2 frets, deflectors, grain · 3 reserved (draws as 2) |
| `weight` | `1` | line weight multiplier |
| `glow` | `true` | line style only |
| `motion` | `false` | `true` \| `'rotor'` \| `'ball'` |
| `speed` | `1` | period divisor; `0` = static |
| `tilt`, `roll`, `phase` | `'auto'` | numeric overrides (degrees) of the seeded values |
| `pocketA pocketB zero rim track cone metal ball stroke` | `'auto'` | any CSS colour string |
| `size` | — | emits width/height; otherwise viewBox only |
| `fit`, `pad` | `'square'`, `0.04` | framing |
| `precision` | `0` | decimals for coordinates |
| `salt` | `''` | extra entropy for ids — two wheels with one seed on one page |
| `title` | — | `role="img"` + escaped `aria-label`; otherwise `aria-hidden="true"` |

## API

```js
Roulette.svg(opts)                 // → string. Pure; Node and browser.
Roulette.mark(opts)                // → string. The emblem: logo glyph or favicon. Pure.
Roulette.table(opts)               // → string. The betting layout, 14:5. Pure.
Roulette.palette(brand, {theme})   // → {role: hex, …, background, halo}
Roulette.init(el, opts)            // browser → {el, get(), set(opts), destroy()}
```

`init` accepts an element or a selector and returns `null` when nothing matches (sibling
convention). `set` re-renders; explicit colours stay pinned across `set({brand})`. Loading the
script touches nothing on `window` except defining `Roulette` (browser) or `module.exports`
(CommonJS).

## Determinism

- Every seeded parameter draws from its **own** sub-seed:
  `u(k) = mulberry32(fmix32(seed32 ^ imul(k, 0x9E3779B9)))`; a string seed goes through FNV-1a.
  No parameter reads a shared stream cursor, so adding a parameter never re-rolls a wheel.
- No `Math.random`, no `Date`. The default seed is fixed (unlike the siblings — a build must
  reproduce).
- Numbers: integers at R = 1000, 2 decimals for dashes and ring radii, 4 for the matrix; round,
  then `String` (no `-0`, no exponent notation). Dashes need the second decimal: the pocket length is
  repeated up to 37 times round the circle, and one decimal let the rounding drift ~2 units into
  the last pocket.
- **Contract:** same (seed, options) → byte-identical string within a minor version (ADR 010).
  **`brand` never touches geometry, `seed` never touches colour:** a brand-only change differs
  only inside colour literals; a seed-only change keeps the same set of colours.

## No signature

A wheel is meant to be rendered many times over, and nothing in the output should name or
fingerprint the tool that drew it (ADR 005). It contains **no**
comments, `<desc>`/`<metadata>`, `data-*`, `xmlns:xlink` (use `href`), `version`, library names,
or fixed reference colours — with one stated exception: the flat style's shading overlays are
`#000` and `#fff` at fixed opacities, because volume from overlays is what lets a pinned `var()`
base shade (spec: Styles). They are grammar of the drawing, like its element skeleton; with every
role pinned, they are the only colour literals left (a test pins that). Every id, class, keyframe
and custom-property name is a seeded token
`[a-z][a-z0-9]{5}` from `u('ids')` plus `salt`. Test, seeds 1–100: nothing identifying (comments,
metadata, `data-*`, `xlink`, library or credit names), every id is a token, no id appears under two
seeds, every `#ref` resolves inside its own picture. Known limit: the element skeleton — tag
names, attribute names, the grammar of SVG, the shading constants — is the same on every output
(ADR 005, addenda); a later `polymorph` option can vary encodings and shading by seed.

## Performance and size

- Library: budget in `package.json` `config.sizeBudget`, measured by `npm run size` (terser in
  process + gzip level 9 — never the `gzip` CLI, whose header carries the file name). Frozen after
  M3 at 6656 B, **raised to 7168 B for `mark()`** (measured 7006 B, ADR 009). The rule attached to
  that raise: the next feature raises it again on the record, or does not come.
- Output: ≤ 8 KB raw at any detail (flat + tilt + motion: ~4.7 KB).

## Promotion

Credits live only in the README, the demo and package.json — never in the output. Demo panel and
footer: "Made in [301](https://301.st) · for [spintax.net](https://spintax.net)". The default
brand is spintax.net's triad: `seed` is the spintax idea applied to geometry.

## Naming, layout, release

- Package `roulette-lite`, global `Roulette`, repo `investblog/roulette-lite`, source
  `roulette.js`, generated `roulette.min.js` (not committed), types `roulette.d.ts` (ADR 003).
- ES5 IIFE with a UMD tail: CommonJS gets `module.exports`, a browser gets `window.Roulette`;
  default import only (ADR 007). **ES5 is the syntax, not the runtime:** the seeds use `Math.imul`
  (ES2015), as the siblings' do, so the runtime is anything that has it — current browsers and
  supported Node releases (CI runs 22 and 24). `init()` also wants `IntersectionObserver` for its
  off-screen pause and draws without it.
- Release: OIDC trusted publishing after the house token bootstrap (ADR 001, RELEASING.md).

## Acceptance criteria (v0.1)

- `svg()` runs in Node ESM (`import Roulette from 'roulette-lite'`), CommonJS and a `<script>`.
- Same (seed, options) → identical bytes; the brand/seed independence tests pass.
- The no-signature test passes for seeds 1–100.
- Both styles × both views × both themes look right in a browser — a contact sheet of 24 seeds,
  shown to the user at M1 and M2.
- A `var()` pin recolours live without re-render; two wheels on one page do not collide; reduced
  motion stops every animation.
- `npm run lint`, `npm test`, `npm run size` pass; `test/verify.html` (cache-busted) is ALL GREEN.

## See also

- `docs/decisions/` — the ADRs; `docs/TODO.md` — the backlog.
- Siblings: [trigons-lite](https://github.com/investblog/trigons-lite),
  [hexagons-lite](https://github.com/investblog/hexagons-lite),
  [octagons](https://github.com/investblog/octagons).
