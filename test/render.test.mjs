// The byte-level contracts of svg() and palette() (spec: Determinism, No signature, Colour).
// These are the things a browser page checks poorly and a machine checks well (ADR 008); how the
// wheel LOOKS is still judged in a browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Roulette from '../roulette.js';

const HEX = /#[0-9a-f]{6}/gu;
const colours = (s) => [...new Set(s.match(HEX))].sort();
const ids = (s) => [...s.matchAll(/\bid="([^"]+)"/gu)].map((m) => m[1]);

test('same seed and options, same bytes — also when other renders happen in between', () => {
	const opts = { seed: 42, brand: '#7c5cff', theme: 'light', detail: 3 };
	const first = Roulette.svg(opts);
	Roulette.svg({ seed: 7 });
	Roulette.svg({ seed: 'example.com', variant: 'american' });
	assert.equal(Roulette.svg(opts), first);
	assert.equal(Roulette.svg({ seed: 'example.com' }), Roulette.svg({ seed: 'example.com' }));
	assert.notEqual(Roulette.svg({ seed: 'example.com' }), Roulette.svg({ seed: 'example.org' }));
});

test('brand never touches geometry: a brand-only change differs only in colour literals', () => {
	for (const seed of [1, 2, 'example.com']) {
		const a = Roulette.svg({ seed, brand: '#7c5cff' }).replace(HEX, '#');
		const b = Roulette.svg({ seed, brand: ['#c2410c', '#0ea5e9'], theme: 'light' }).replace(HEX, '#');
		assert.equal(a, b, `seed ${seed}`);
	}
});

test('seed never touches colour: a seed-only change keeps the same colours', () => {
	const base = colours(Roulette.svg({ seed: 1, brand: '#c2410c' }));
	for (const seed of [2, 3, 'example.com', 99]) {
		assert.deepEqual(colours(Roulette.svg({ seed, brand: '#c2410c' })), base, `seed ${seed}`);
	}
});

test('the palette port is exact where the body is the brand\'s first colour', () => {
	// Fixture captured from hexagons-lite (hexagons.js) on 2026-09-18 (ADR 004). A red
	// brand (terracotta) is left out on purpose: its only colour becomes the red pockets and the
	// body turns to wood, so its ramp differs from hexagons by design (ADR 011).
	const fixture = JSON.parse(readFileSync(new URL('./fixtures/hexagons-palettes.json', import.meta.url), 'utf8'));
	const brands = { triad: undefined, violet: '#7c5cff', grey: '#777777', pair: ['#0ea5e9', '#f59e0b'] };
	for (const [key, want] of Object.entries(fixture)) {
		const [name, theme] = key.split('/');
		if (!(name in brands)) continue;
		const got = Roulette.palette(brands[name], { theme });
		assert.deepEqual(got.stroke, want.colors, `${key} colors`);
		assert.equal(got.background, want.background, `${key} background`);
		assert.equal(got.halo, want.halo, `${key} halo`);
	}
});

// CIE LCh(ab) of a hex, D65 — the test's own copy, so it does not trust the code it checks
function lch(hex) {
	const lin = (u) => { u /= 255; return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4; };
	const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16)));
	const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
	const x = f((0.41246 * r + 0.35758 * g + 0.18044 * b) / 0.95047);
	const y = f(0.21267 * r + 0.71515 * g + 0.07218 * b);
	const z = f((0.01933 * r + 0.11919 * g + 0.9503 * b) / 1.08883);
	const A = 500 * (x - y), B = 200 * (y - z);
	return [116 * y - 16, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
}
const near = (h, target, win) => { const d = Math.abs(h - target) % 360; return Math.min(d, 360 - d) <= win; };

test('whatever the brand, the wheel reads as a roulette: red, black, a green zero', () => {
	const brands = [undefined, '#00abf3', '#c2410c', '#16a34a', '#7c5cff', '#777777', '#ffe600', '#ec4899', ['#0ea5e9', '#f59e0b'], ['#111111', '#eeeeee']];
	for (const theme of ['dark', 'light']) {
		for (const brand of brands) {
			const p = Roulette.palette(brand, { theme }), tag = `${theme} ${JSON.stringify(brand)}`;
			const [redL, redC, redH] = lch(p.pocketA), [, zeroC, zeroH] = lch(p.zero), [blackL] = lch(p.pocketB);
			assert.ok(near(redH, 28, 40) && redC >= 30, `${tag}: pocketA ${p.pocketA} is not red`);
			assert.ok(near(zeroH, 145, 40) && zeroC >= 30, `${tag}: zero ${p.zero} is not green`);
			assert.ok(blackL < 20, `${tag}: pocketB ${p.pocketB} is not black`);
			assert.ok(redL > blackL + 15, `${tag}: red and black too close`);
		}
	}
});

test('every brand colour is used: the spintax triad fills red, brass and the body', () => {
	const p = Roulette.palette(undefined);
	assert.ok(near(lch(p.pocketA)[2], lch('#a91455')[2], 3), `crimson not in the pockets: ${p.pocketA}`);
	assert.ok(near(lch(p.metal)[2], lch('#d6af3c')[2], 3), `gold not in the metal: ${p.metal}`);
	assert.ok(near(lch(p.rim)[2], lch('#00abf3')[2], 5), `blue not in the body: ${p.rim}`);
	assert.ok(near(lch(p.zero)[2], 145, 3), 'the zero is not the classic green');
});

test('a brand with only a red is a red wheel on wood in its own hue; a grey one gets chrome', () => {
	const red = Roulette.palette('#c2410c'), brand = lch('#c2410c'), rim = lch(red.rim);
	assert.ok(near(lch(red.pocketA)[2], brand[2], 3), 'the red brand is not in the pockets');
	assert.ok(near(rim[2], brand[2], 8) && rim[1] < brand[1] * 0.7, `rim ${red.rim} is not wood in the brand hue`);
	assert.ok(lch(Roulette.palette('#777777').metal)[1] < 3, 'a grey brand should get chrome, not brass');
});

test('every role resolves, and the wheel roles stay apart from each other', () => {
	for (const theme of ['dark', 'light']) {
		for (const brand of [undefined, '#7c5cff', '#777777', '#ffe600']) {
			const p = Roulette.palette(brand, { theme });
			for (const role of ['pocketA', 'pocketB', 'zero', 'rim', 'track', 'cone', 'metal', 'ball']) {
				assert.match(p[role], /^#[0-9a-f]{6}$/u, `${theme} ${brand} ${role}`);
			}
			assert.notEqual(p.pocketA, p.pocketB, `${theme} ${brand}: pockets alike`);
		}
	}
});

test('no signature: nothing identifying, and no id shared between two seeds (ADR 005)', () => {
	const seen = new Map();
	for (let seed = 1; seed <= 100; seed++) {
		const out = Roulette.svg({ seed });
		assert.doesNotMatch(out, /<!--|data-|<desc|<metadata|<title|<text|xlink|version=|roulette|spintax|301\.st|301st/iu, `seed ${seed}`);
		for (const id of ids(out)) {
			assert.match(id, /^[a-z][a-z0-9]{5}$/u, `seed ${seed}: id "${id}"`);
			assert.ok(!seen.has(id), `seed ${seed} reuses id ${id} from seed ${seen.get(id)}`);
			seen.set(id, seed);
		}
		// every reference points at an id defined in the same picture
		const own = new Set(ids(out));
		for (const m of out.matchAll(/(?:href="#|url\(#)([^")]+)/gu)) assert.ok(own.has(m[1]), `seed ${seed}: dangling #${m[1]}`);
	}
});

test('salt separates two wheels with one seed on one page', () => {
	const a = ids(Roulette.svg({ seed: 5 }));
	const b = ids(Roulette.svg({ seed: 5, salt: 'second' }));
	assert.equal(a.filter((id) => b.includes(id)).length, 0);
});

test('the markup is well formed: balanced tags, quoted attributes, no NaN', () => {
	for (const opts of [{}, { seed: 'x', detail: 1 }, { seed: 3, detail: 3, variant: 'american' }, { glow: false, stroke: '#fff' }]) {
		const out = Roulette.svg(opts);
		assert.doesNotMatch(out, /NaN|undefined|Infinity|null/u);
		assert.match(out, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[-\d. ]+"/u);
		const stack = [];
		for (const m of out.matchAll(/<(\/?)([a-zA-Z]+)((?:\s+[a-zA-Z][a-zA-Z0-9-]*="[^"]*")*)\s*(\/?)>/gu)) {
			if (m[1]) assert.equal(stack.pop(), m[2]);
			else if (!m[4]) stack.push(m[2]);
		}
		assert.deepEqual(stack, [], JSON.stringify(opts));
		// every tag was matched by the attribute grammar above, so nothing is unquoted
		assert.equal(out.match(/</gu).length, [...out.matchAll(/<(\/?)([a-zA-Z]+)((?:\s+[a-zA-Z][a-zA-Z0-9-]*="[^"]*")*)\s*(\/?)>/gu)].length);
	}
});

test('a pinned colour passes through verbatim, and markup in it is escaped', () => {
	const out = Roulette.svg({ pocketA: 'var(--a, #fff)', metal: 'rgb(1 2 3)' });
	assert.ok(out.includes('var(--a, #fff)'));
	assert.ok(out.includes('rgb(1 2 3)'));
	const hostile = Roulette.svg({ zero: '"/><script>alert(1)</script>' });
	assert.ok(!hostile.includes('<script>'));
	assert.ok(hostile.includes('&quot;/&gt;&lt;script&gt;'));
});

test('pockets: the dash pattern covers the circle exactly, European and American', () => {
	for (const [variant, N, zeroGap] of [['european', 37, 36], ['american', 38, 18]]) {
		const out = Roulette.svg({ seed: 11, variant, style: 'line', view: 'top' });
		const rings = [...out.matchAll(/<circle r="([\d.]+)" fill="none" stroke="[^"]+" stroke-width="[\d.]+" stroke-dasharray="([\d.]+) ([\d.]+)"/gu)];
		const [pocketA, zero] = rings;
		const circumference = 2 * Math.PI * Number(pocketA[1]);
		const L = Number(pocketA[2]);
		assert.ok(Math.abs(L * N - circumference) < 0.5, `${variant}: ${L}×${N} vs ${circumference}`);
		assert.equal(Number(zero[2]), L);
		// L is printed to 2 decimals, so L×gap carries up to gap×0.005 of rounding
		assert.ok(Math.abs(Number(zero[3]) - L * zeroGap) <= zeroGap * 0.005 + 0.01, `${variant} zero gap`);
	}
});

test('decorative by default; an image with a name when given a title', () => {
	assert.match(Roulette.svg(), /aria-hidden="true"/u);
	const named = Roulette.svg({ title: 'A wheel & "ball"' });
	assert.match(named, /role="img" aria-label="A wheel &amp; &quot;ball&quot;"/u);
	assert.doesNotMatch(named, /aria-hidden/u);
});

test('style and view never move the geometry: same seed, same phase and deflectors in all four', () => {
	const phase = (out) => out.match(/rotate\(([-\d.]+)\)/u)[1];
	const deflectors = (out) => [...out.matchAll(/ d="([^"]*Z[^"]*)"/gu)].map((m) => m[1]).sort((a, b) => b.length - a.length)[0];
	for (const seed of [1, 2, 'example.com']) {
		const outs = ['line', 'flat'].flatMap((style) => ['top', 'tilt'].map((view) => Roulette.svg({ seed, style, view })));
		assert.equal(new Set(outs.map(phase)).size, 1, `seed ${seed}: phase moved`);
		assert.equal(new Set(outs.map(deflectors)).size, 1, `seed ${seed}: deflectors moved`);
	}
});

test('the tilted view is one matrix; top view has none; tilt is clamped to 60 degrees', () => {
	assert.doesNotMatch(Roulette.svg({ seed: 3, view: 'top' }), /matrix\(/u);
	assert.match(Roulette.svg({ seed: 3, tilt: 80, roll: 0 }), /transform="matrix\(1 0 0 0\.5 0 0\)"/u);
	assert.match(Roulette.svg({ seed: 3, tilt: 0, roll: 0 }), /transform="matrix\(1 0 0 1 0 0\)"/u);
});

test('seeded tilt and roll stay in their ranges', () => {
	for (let seed = 1; seed <= 200; seed++) {
		const [a, b, c, d] = Roulette.svg({ seed }).match(/transform="matrix\(([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) 0 0\)"/u).slice(1).map(Number);
		const roll = Math.atan2(b, a) * 180 / Math.PI;
		const tilt = Math.acos(Math.hypot(c, d)) * 180 / Math.PI;
		assert.ok(roll >= -18.01 && roll <= 18.01, `seed ${seed}: roll ${roll}`);
		assert.ok(tilt >= 41.99 && tilt <= 58.01, `seed ${seed}: tilt ${tilt}`);
	}
});

test('the square frame holds the whole wheel for every seed', () => {
	for (let seed = 1; seed <= 60; seed++) {
		const out = Roulette.svg({ seed });
		const [x, y, w, h] = out.match(/viewBox="([^"]+)"/u)[1].split(' ').map(Number);
		assert.equal(w, h, `seed ${seed}: not square`);
		const [a, b, c, d] = out.match(/matrix\(([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) 0 0\)/u).slice(1).map(Number);
		// the rim's bottom circle (plane y = 0) and top circle must fall inside the frame
		for (let deg = 0; deg < 360; deg += 5) {
			const px = 1000 * Math.cos(deg * Math.PI / 180), py = 1000 * Math.sin(deg * Math.PI / 180);
			const sx = a * px + c * py, sy = b * px + d * py;
			assert.ok(sx >= x && sx <= x + w && sy >= y && sy <= y + h, `seed ${seed}: rim point ${deg} outside`);
		}
	}
});

test('a colour goes to the role nearest its hue, not the first that would have it (Codex review)', () => {
	// amber sits in both the red window (36° away) and the brass window (21° away): brass is nearer
	const amber = Roulette.palette('#d97706');
	assert.ok(near(lch(amber.metal)[2], lch('#d97706')[2], 3), `amber should be the brass: metal ${amber.metal}`);
	assert.ok(near(lch(amber.pocketA)[2], 28, 3), `the pockets should be classic red: ${amber.pocketA}`);
});

test('every colour given is used: a second leftover colours the bowl, a grey one the body (Codex review)', () => {
	const two = Roulette.palette(['#00abf3', '#7c5cff']);
	assert.ok(near(lch(two.rim)[2], lch('#00abf3')[2], 5), `rim ${two.rim} should be the first colour`);
	assert.ok(near(lch(two.track)[2], lch('#7c5cff')[2], 5) && two.cone === two.track, `bowl ${two.track} should be the second`);
	const greyRed = Roulette.palette(['#777777', '#c2410c']);
	assert.ok(lch(greyRed.rim)[1] < 3, `with the red in the pockets, the grey is the body: rim ${greyRed.rim}`);
	assert.ok(near(lch(greyRed.pocketA)[2], lch('#c2410c')[2], 3), 'the red is in the pockets');
	// a grey next to a chromatic body is the chrome when no colour took the brass, else the bowl
	const greyBlue = Roulette.palette(['#777777', '#00abf3']);
	assert.ok(near(lch(greyBlue.rim)[2], lch('#00abf3')[2], 5), `rim ${greyBlue.rim} should be the blue`);
	assert.ok(lch(greyBlue.metal)[1] < 3, `the grey should be the chrome: metal ${greyBlue.metal}`);
	const three = Roulette.palette(['#777777', '#00abf3', '#7c5cff']);
	assert.ok(lch(three.metal)[1] < 3 && near(lch(three.track)[2], lch('#7c5cff')[2], 5), 'grey, blue, violet: chrome, body, bowl');
	const brass = Roulette.palette(['#777777', '#d6af3c', '#00abf3']);
	assert.ok(lch(brass.track)[1] < 3 && near(lch(brass.metal)[2], lch('#d6af3c')[2], 3), 'with the gold as brass, the grey is the bowl');
	// any set of up to three chromatic colours shows up somewhere in the wheel
	const pool = ['#00abf3', '#d6af3c', '#a91455', '#7c5cff', '#16a34a', '#c2410c', '#0d9488', '#ec4899'];
	for (let i = 0; i < pool.length; i++) {
		for (let j = i + 1; j < pool.length; j++) {
			const brand = [pool[i], pool[j]], p = Roulette.palette(brand);
			const shown = ['pocketA', 'zero', 'metal', 'rim', 'track'].map((k) => lch(p[k])[2]);
			for (const colour of brand) assert.ok(shown.some((h) => near(h, lch(colour)[2], 6)), `${JSON.stringify(brand)}: ${colour} not used`);
		}
	}
});

test('the frame holds the outer line and its glow at any weight (Codex review)', () => {
	for (const [weight, glow] of [[1, true], [2.5, true], [2.5, false]]) {
		const out = Roulette.svg({ seed: 1, style: 'line', view: 'top', weight, glow, pad: 0 });
		const [x] = out.match(/viewBox="([^"]+)"/u)[1].split(' ').map(Number);
		const reach = 1000 + 6 * weight * 1.6 * (glow ? 3.5 : 1) / 2;
		assert.ok(-x >= reach - 0.5, `weight ${weight} glow ${glow}: frame ${-x} < reach ${reach}`);
	}
});

test('with every role pinned, the only colour literals left are the shading overlays', () => {
	const pins = Object.fromEntries(['pocketA', 'pocketB', 'zero', 'rim', 'track', 'cone', 'metal', 'ball', 'stroke'].map((k) => [k, `var(--${k})`]));
	for (const style of ['flat', 'line']) {
		const out = Roulette.svg({ seed: 2, style, ...pins });
		const literals = new Set([...out.matchAll(/="(#[0-9a-f]{3,6})"/gu)].map((m) => m[1]));
		assert.deepEqual([...literals].filter((c) => c !== '#000' && c !== '#fff'), [], style);
	}
});
