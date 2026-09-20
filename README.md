# roulette-lite

A roulette wheel drawn by code. One call returns an SVG string — in Node at build time or in the
browser — so a static site gets its hero art with no script on the page. **`seed`** spins the
geometry, **`brand`** spins the colours: red, black and a green zero stay a roulette's, and your
brand fills them. Flat colour with volume or line art, seen from above or in three-quarter view,
with an optional spin that stops for readers who asked for less motion. Zero dependencies,
~6.8 KB gzipped.

[![npm](https://img.shields.io/npm/v/roulette-lite.svg)](https://www.npmjs.com/package/roulette-lite)
[![license](https://img.shields.io/npm/l/roulette-lite.svg)](LICENSE)

**[Live demo →](https://investblog.github.io/roulette-lite/)** — every option wired to a control, a
24-seed contact sheet, and the mark.

## Install

```sh
npm install roulette-lite
```

Or from a CDN, no build step:

```html
<script src="https://cdn.jsdelivr.net/npm/roulette-lite@0.1/roulette.min.js"></script>
```

The file is one script in ES5 syntax that runs anywhere `Math.imul` does — current browsers and
supported Node releases (CI runs 22 and 24): a `<script>` gets the global `Roulette`, Node and
bundlers get `module.exports`. Use the default import:

```js
import Roulette from 'roulette-lite';
```

## Use it

At build time — an Astro page, a static generator, anything that runs Node:

```js
const markup = Roulette.svg({ seed: 'example.com', brand: '#7c5cff' });
// inline it: <div class="hero-art" aria-hidden="true" set:html={markup} />
```

In the browser:

```js
const wheel = Roulette.init('#hero-art', { seed: 42, motion: true });
wheel.set({ brand: '#c2410c' });   // re-renders; colours you pinned stay pinned
wheel.destroy();
```

The SVG has a `viewBox` and no size of its own: size it with CSS — `svg { width: 100%; height:
auto; }` — or the `size` option. The frame is square by default, so every wheel fits the same CSS.

## Colour: roulette meanings, your brand

You pass one to three brand colours. Each takes the role nearest its hue — **red pockets**, the
**green zero**, **brass** — the first colour left over becomes the body (the rim) and a second
one the bowl (track and cone). A role no colour took gets its classic hue in your brand's key,
and black is always derived.

| Brand | Pockets | Zero | Metal | Body |
|---|---|---|---|---|
| spintax triad `#00abf3 #d6af3c #a91455` | the crimson | classic green | the gold | the blue |
| one blue | classic red | classic green | brass | the blue |
| one red (`#c2410c`) | the red itself | classic green | brass | wood in the red's hue |
| grey | classic red | classic green | chrome | graphite |
| blue + violet | classic red | classic green | brass | blue rim, violet bowl |
| grey + red | the red | classic green | chrome | graphite |
| grey + blue | classic red | classic green | chrome | the blue |

Every role can be pinned with any CSS colour, including a custom property — which is how a site
with a light/dark toggle recolours an inline wheel with no script:

```js
Roulette.svg({ seed: 7, pocketA: 'var(--wheel-red, #c4356a)', rim: 'var(--wheel-body, #005075)' });
```

`Roulette.palette(brand, { theme })` returns the derived colours for either theme, so you can
publish them as your own custom properties at build time.

## Options

| Option | Default | What |
|---|---|---|
| `seed` | `1` | a string (a domain name is fine) or a 32-bit unsigned integer — `1.5` is `1` |
| `brand` | spintax triad | hex or up to three hexes |
| `theme` | `'dark'` | `'dark'` \| `'light'` |
| `style` | `'flat'` | `'flat'` \| `'line'` |
| `view` | `'tilt'` | `'tilt'` \| `'top'` |
| `variant` | `'european'` | `'european'` (37) \| `'american'` (38) \| `'auto'` |
| `detail` | `2` | `1` silhouette · `2` frets, deflectors, grain |
| `motion` | `false` | `true` \| `'rotor'` \| `'ball'` |
| `speed` | `1` | divides the periods; `0` stops |
| `tilt`, `roll`, `phase` | `'auto'` | degrees, overriding the seed |
| `pocketA` `pocketB` `zero` `rim` `track` `cone` `metal` `ball` `stroke` | `'auto'` | any CSS colour |
| `weight`, `glow` | `1`, `true` | line style |
| `size`, `fit`, `pad` | —, `'square'`, `0.04` | framing |
| `salt` | `''` | two wheels with one seed on one page |
| `title` | — | an accessible name; without it the picture is `aria-hidden` |

## The mark: logo glyph and favicon

The same wheel reduced to what reads at 16 px — a rim, one ring of 8 to 16 segments, a hub, maybe
the crosshead's bars — for the glyph beside a site's name or its favicon:

```js
Roulette.mark({ seed: 'example.com', mono: true });                  // a logo in currentColor
Roulette.mark({ seed: 'example.com', brand: '#7c5cff', badge: true }); // a favicon on a backplate
```

Seeded from streams of its own, so a site's mark and its hero wheel share a seed without moving
each other. No ids or styles inside — any number of marks can sit on one page.

## The table: a hero band the wheel stands on

```js
Roulette.table({ seed: 'example.com', brand: '#7c5cff' });      // the betting layout, 14:5
Roulette.table({ seed: 'example.com', felt: '#0a3d2c' });       // classic baize instead of the brand's
Roulette.table({ seed: 'example.com', felt: false });           // no cloth: the page shows through
```

The real layout — 12 × 3 with the zero across three rows (`variant: 'american'` splits it into 0
and 00), dozens, column bets, the six outside boxes — in the same roles as the wheel. There are no
digits on it: at hero size they would be a font dependency and the same visible text on every page
that used it, so the layout is carried by its proportions and by the canonical red/black pattern,
which is irregular, not a checkerboard. Under `theme: 'light'` it defaults to the `line` style,
where only the red cells and the zero take colour — filled cells over a white page fight the
site's palette rather than joining it.

## Motion

`motion: true` turns the wheel slowly one way and runs the ball the other, as CSS inside the SVG
— no script on the page. `prefers-reduced-motion: reduce` stops every animation. Every class,
keyframe and custom-property name is seeded, so two wheels on one page do not collide as long as
their seeds differ — numbers compared as 32-bit integers — or, for one seed twice, their `salt`
does. With `init()`, a wheel sleeps while it is off screen.

## Same seed, same bytes

The output for a given seed and options is byte-identical, and a seed is independent of the
brand: change the colours and the geometry does not move. Within a minor version the output does
not change; any change to it is a minor release with a line in the changelog — pin the exact
version if you render at build time.

## The family

roulette-lite is a sibling of three zero-dependency polygon backgrounds by the same hands —
[trigons-lite](https://github.com/investblog/trigons-lite),
[hexagons-lite](https://github.com/investblog/hexagons-lite) and
[octagons](https://github.com/investblog/octagons) — and shares hexagons-lite's colour engine.
They tile a shape wide; this one draws one subject deep.

## Credits

Built by [301ST](https://301.st) for [spintax.net](https://spintax.net) — the same idea as a
spintax template: one source, a different result for every seed.

MIT © [301ST](https://301.st)
