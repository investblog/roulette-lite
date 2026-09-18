/*!
 * roulette-lite — procedural roulette-wheel illustrations as an SVG string.
 * MIT © 301ST (https://301.st) · for spintax.net
 *
 * One file, ES5, zero dependencies. Works as a <script> (defines `Roulette`) and as a CommonJS
 * module (Node, bundlers) — ADR 007. The spec is docs/README.md: change the doc before the code.
 */
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.Roulette = api;
})(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	var NS = 'http://www.w3.org/2000/svg';
	var DEFAULT_BRAND = ['#00abf3', '#d6af3c', '#a91455'];
	var R = 1000;
	var DEG = Math.PI / 180;

	// ── numbers and markup ──────────────────────────────────────────────────

	// Round, then String: no exponent notation, and no "-0" (it is a different string from "0").
	function n(v, d) {
		var p = Math.pow(10, d || 0), r = Math.round(v * p) / p;
		return String(r === 0 ? 0 : r);
	}
	function esc(s) {
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
	// attrs is a flat [name, value, …] list; a null value drops the attribute
	function el(tag, attrs, inner) {
		var s = '<' + tag;
		for (var i = 0; i < attrs.length; i += 2) if (attrs[i + 1] != null) s += ' ' + attrs[i] + '="' + attrs[i + 1] + '"';
		return inner == null ? s + '/>' : s + '>' + inner + '</' + tag + '>';
	}

	// ── seeds ───────────────────────────────────────────────────────────────

	function fnv(str) {
		var h = 0x811c9dc5;
		for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
		return h >>> 0;
	}
	function fmix(h) {
		h = Math.imul(h ^ h >>> 16, 0x85ebca6b);
		h = Math.imul(h ^ h >>> 13, 0xc2b2ae35);
		return (h ^ h >>> 16) >>> 0;
	}
	function mulberry(a) {
		return function () {
			a = (a + 0x6D2B79F5) >>> 0;
			var x = Math.imul(a ^ (a >>> 15), 1 | a);
			x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
			return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
		};
	}
	// Every parameter reads its OWN stream, keyed by name. Nothing shares a cursor, so adding a
	// parameter later never re-rolls an existing wheel (the hexagons lesson, ADR 010).
	function streams(seed) {
		var s = typeof seed === 'number' ? seed >>> 0 : fnv(String(seed));
		return function (key) { return mulberry(fmix(s ^ Math.imul(fnv(key), 0x9E3779B9))); };
	}

	// ── auto-palette: sRGB <-> CIE LCh(ab), D65 — ported unchanged from hexagons (ADR 004) ──

	function parseColor(str) {
		str = String(str).trim();
		if (str.charAt(0) === '#') {
			var h = str.slice(1);
			if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
			var v = parseInt(h, 16);
			return [v >> 16 & 255, v >> 8 & 255, v & 255];
		}
		var m = str.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
		return m ? [+m[1], +m[2], +m[3]] : [255, 255, 255];
	}
	function toHex(c) {
		return '#' + ((1 << 24) + ((c[0] | 0) << 16) + ((c[1] | 0) << 8) + (c[2] | 0)).toString(16).slice(1);
	}
	function s2l(u) { u /= 255; return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); }
	function l2s(u) { return 255 * (u <= 0.0031308 ? u * 12.92 : 1.055 * Math.pow(u, 1 / 2.4) - 0.055); }
	function fwd(t) { return t > 216 / 24389 ? Math.pow(t, 1 / 3) : (24389 / 27 * t + 16) / 116; }
	function inv(t) { var c = t * t * t; return c > 216 / 24389 ? c : (116 * t - 16) * 27 / 24389; }

	function rgb2lch(rgb) {
		var r = s2l(rgb[0]), g = s2l(rgb[1]), b = s2l(rgb[2]);
		var x = (0.41246 * r + 0.35758 * g + 0.18044 * b) / 0.95047;
		var y = 0.21267 * r + 0.71515 * g + 0.07218 * b;
		var z = (0.01933 * r + 0.11919 * g + 0.9503 * b) / 1.08883;
		var fx = fwd(x), fy = fwd(y), fz = fwd(z);
		var L = 116 * fy - 16, A = 500 * (fx - fy), B = 200 * (fy - fz);
		var C = Math.sqrt(A * A + B * B);
		var H = Math.atan2(B, A) * 180 / Math.PI;
		return [L, C, (H + 360) % 360];
	}
	function lch2lin(L, C, H) {
		var A = C * Math.cos(H * Math.PI / 180), B = C * Math.sin(H * Math.PI / 180);
		var fy = (L + 16) / 116, fx = fy + A / 500, fz = fy - B / 200;
		var x = inv(fx) * 0.95047, y = inv(fy), z = inv(fz) * 1.08883;
		return [
			3.24045 * x - 1.53714 * y - 0.49853 * z,
			-0.96927 * x + 1.87601 * y + 0.04156 * z,
			0.05564 * x - 0.20403 * y + 1.05723 * z
		];
	}
	// Gamut policy: hold L and H, reduce C until inside sRGB. Never channel-clip — clipping
	// shifts hue, and hue is the brand's identity.
	function lch2rgb(L, C, H) {
		var lin = lch2lin(L, C, H), lo = 0, hi = C, i;
		if (!inGamut(lin)) {
			for (i = 0; i < 20; i++) {
				var mid = (lo + hi) / 2;
				lin = lch2lin(L, mid, H);
				if (inGamut(lin)) lo = mid; else hi = mid;
			}
			lin = lch2lin(L, lo, H);
		}
		return [clamp255(l2s(lin[0])), clamp255(l2s(lin[1])), clamp255(l2s(lin[2]))];
	}
	function inGamut(lin) {
		for (var i = 0; i < 3; i++) if (lin[i] < -0.0005 || lin[i] > 1.0005) return false;
		return true;
	}
	function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }
	function lum(rgb) { return 0.2126 * s2l(rgb[0]) + 0.7152 * s2l(rgb[1]) + 0.0722 * s2l(rgb[2]); }
	function contrast(a, b) {
		var x = lum(a), y = lum(b);
		return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
	}
	// Repair by shifting L only (fidelity: hue and chroma are the brand's)
	function ensureContrast(rgb, bgRgb, min, dir) {
		if (contrast(rgb, bgRgb) >= min) return rgb;
		var lch = rgb2lch(rgb);
		for (var L = lch[0]; L >= 2 && L <= 98; L += dir * 2) {
			var c = lch2rgb(L, lch[1], lch[2]);
			if (contrast(c, bgRgb) >= min) return c;
		}
		return rgb;
	}
	// hexagons' derive(), unchanged: same input, same colours as Hexagons.palette().
	function derive(brand, theme) {
		var arr = (typeof brand === 'string' ? [brand] : brand).map(function (x) {
			return rgb2lch(parseColor(x));
		});
		var chrom = [];
		for (var i = 0; i < arr.length; i++) if (arr[i][1] >= 12) chrom.push(arr[i]);
		var neutral = chrom.length === 0;
		var prim = neutral ? [50, 0, 0] : chrom[0];
		var acc = chrom.length > 1 ? chrom[1] : [0, prim[1], (prim[2] + 40) % 360];
		var hotH = (chrom.length > 2 ? chrom[2] : prim)[2];
		var C = prim[1], H = prim[2], light = theme === 'light';

		var bg = light
			? lch2rgb(97, neutral ? 0 : 3, H)
			: lch2rgb(6, Math.min(C * 0.2, 10), H);
		var halo = light
			? lch2rgb(92, Math.min(C * 0.2, 8), H)
			: lch2rgb(12, Math.min(C * 0.3, 15), H);
		var Ls = light ? [72, 52, 32] : [32, 58, 82];
		var dir = light ? -1 : 1;
		var stops = [
			ensureContrast(lch2rgb(Ls[0], C * 0.9, H), bg, 1.5, dir),
			ensureContrast(lch2rgb(Ls[1], C, H), bg, 2.5, dir),
			ensureContrast(lch2rgb(Ls[2], C * 0.55, H), bg, 5, dir)
		];
		var accent = ensureContrast(lch2rgb(light ? 45 : 70, acc[1], acc[2]), bg, 3, dir);
		var hot = ensureContrast(
			lch2rgb(light ? 28 : 92, neutral ? 0 : (light ? 24 : 12), hotH), bg, 7, dir);

		return { colors: stops, accent: accent, hot: hot, background: bg, halo: halo };
	}

	// Roulette colours from the brand (spec: Colour, ADR 011). Every chromatic brand colour and
	// every role whose window it falls in make a pair; the nearest pairs are settled first, each
	// colour and each role once — so a colour goes to the role nearest its hue, not to the first
	// role that would have it. A role nobody took gets its classic hue in the brand's key; black is
	// always derived. The first colour left over is the body, the second the bowl. A grey brand
	// colour is the body when no chromatic one is left; otherwise it is chrome if no colour took the
	// brass, else the bowl if that is still free. With neither, the body is the brand's hue as wood.
	function roles(brand, theme) {
		var light = theme === 'light', list = brand == null ? DEFAULT_BRAND : typeof brand === 'string' ? [brand] : brand;
		var chrom = [], grey = null, pairs = [], got = [], used = [], free = [], i, r;
		var ROLE = [[28, 40], [145, 40], [85, 25]];
		for (i = 0; i < list.length; i++) {
			var c = rgb2lch(parseColor(list[i]));
			if (c[1] >= 12) chrom.push({ lch: c, hex: list[i] });
			else if (!grey) grey = list[i];
		}
		for (i = 0; i < chrom.length; i++) {
			for (r = 0; r < 3; r++) {
				var d = Math.abs(chrom[i].lch[2] - ROLE[r][0]) % 360;
				d = Math.min(d, 360 - d);
				if (d <= ROLE[r][1]) pairs.push([d, i, r]);
			}
		}
		// ties broken by colour then role, so the order never depends on the engine's sort
		pairs.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]; });
		for (i = 0; i < pairs.length; i++) {
			if (!got[pairs[i][2]] && !used[pairs[i][1]]) { got[pairs[i][2]] = chrom[pairs[i][1]].lch; used[pairs[i][1]] = 1; }
		}
		for (i = 0; i < chrom.length; i++) if (!used[i]) free.push(chrom[i]);
		var red = got[0], zero = got[1], gold = got[2];
		var body = free[0] ? free[0].lch : grey || !chrom.length ? [50, 0, 0] : [chrom[0].lch[0], chrom[0].lch[1] * 0.45, chrom[0].lch[2]];
		var dk = light ? 'light' : 'dark';
		var p = derive(free[0] ? free[0].hex : grey || (chrom.length ? toHex(lch2rgb(body[0], body[1], body[2])) : list), dk);
		var chrome = grey && free[0] && !gold;
		var bowl = free[1] ? derive(free[1].hex, dk).colors[0] : grey && free[0] && !chrome ? derive(grey, dk).colors[0] : p.colors[0];
		var bC = body[1], black = lch2rgb(14, Math.min(bC * 0.15, 6), body[2]);
		var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
		return {
			pocketA: ensureContrast(red ? lch2rgb(46, red[1], red[2]) : lch2rgb(46, clamp(bC * 1.2, 50, 75), 28), black, 2.5, 1),
			pocketB: black,
			zero: ensureContrast(zero ? lch2rgb(50, zero[1], zero[2]) : lch2rgb(50, clamp(bC, 35, 60), 145), black, 2.5, 1),
			metal: ensureContrast(lch2rgb(light ? 40 : 78, gold ? gold[1] * 0.8 : bC && !chrome ? 35 : 0, gold ? gold[2] : 85), black, 3, 1),
			rim: p.colors[0], track: bowl, cone: bowl,
			ball: ensureContrast(p.hot, bowl, 3, light ? -1 : 1),
			stroke: p.colors, background: p.background, halo: p.halo
		};
	}

	function palette(brand, opts) {
		var r = roles(brand, opts && opts.theme), out = {};
		for (var k in r) out[k] = k === 'stroke' ? r[k].map(toHex) : toHex(r[k]);
		return out;
	}

	// ── geometry: every seeded parameter, each from its own stream ──────────

	function geometry(o) {
		var S = streams(o.seed == null ? 1 : o.seed);
		var g = { S: S };
		g.r1 = (0.84 + 0.04 * S('rimW')()) * R;
		var b = S('bowl');
		g.r2 = g.r1 - (0.09 + 0.02 * b()) * R;
		g.r3 = g.r2 - (0.07 + 0.02 * b()) * R;
		g.r4 = g.r3 - (0.05 + 0.02 * b()) * R;
		g.r5 = g.r4 - (0.11 + 0.02 * b()) * R;
		var d = S('defl');
		g.defN = d() < 0.75 ? 8 : 16;
		g.defPhase = d() * 45;
		g.canoe = d() < 0.5;
		var c = S('cone');
		g.rise = (0.05 + 0.03 * c()) * R;
		g.inlays = c() < 0.5 ? 4 : 8;
		var t = S('turret');
		g.rt = (0.045 + 0.02 * t()) * R;
		g.th = (0.08 + 0.06 * t()) * R;
		var a = S('arms');
		g.arm = (0.18 + 0.08 * a()) * R;
		g.armStyle = Math.floor(a() * 3);
		g.phase = typeof o.phase === 'number' ? o.phase : 360 * S('phase')();
		g.ball = -160 + 140 * S('ball')();
		// motion: which way the wheel turns, and how long a turn of the wheel and of the ball take
		g.dir = S('dir')() < 0.5 ? 1 : -1;
		g.tr = 48 + 32 * S('tr')();
		g.tb = 12 + 10 * S('tb')();
		g.H = (0.12 + 0.06 * S('rimH')()) * R;
		// the view: tilt 42–58° and a roll, each from its own stream so the top view never reads them
		g.tilt = typeof o.tilt === 'number' ? o.tilt : 42 + 16 * S('tilt')();
		g.roll = typeof o.roll === 'number' ? o.roll : -18 + 36 * S('roll')();
		var gr = S('grain');
		g.grain = [];
		for (var k = 2 + Math.floor(gr() * 3); k > 0; k--) g.grain.push([g.r1 + (0.1 + 0.8 * gr()) * (R - g.r1), gr() < 0.5 ? '#000' : '#fff', 0.05 + 0.03 * gr()]);
		g.N = o.variant === 'american' ? 38
			: o.variant === 'auto' ? (S('variant')() < 0.5 ? 37 : 38) : 37;
		return g;
	}

	// seeded ids: [a-z][a-z0-9]{5}, never repeated within one picture (ADR 005)
	function tokens(S, salt) {
		var r = S('ids' + (salt || '')), used = {}, AZ = 'abcdefghijklmnopqrstuvwxyz', AZ09 = AZ + '0123456789';
		return function () {
			var tk;
			do {
				tk = AZ.charAt(Math.floor(r() * 26));
				for (var i = 0; i < 5; i++) tk += AZ09.charAt(Math.floor(r() * 36));
			} while (used[tk]);
			used[tk] = 1;
			return tk;
		};
	}

	// ── drawing ─────────────────────────────────────────────────────────────

	function pt(r, deg, p) {
		return n(r * Math.cos(deg * DEG), p) + ' ' + n(r * Math.sin(deg * DEG), p);
	}
	// one ring of equal pockets as a dashed stroke: dash boundaries on a stroked circle are
	// radial, so each dash IS an annular sector (spec: pockets without sector paths)
	function ring(r, width, colour, dash, offset) {
		return el('circle', ['r', n(r, 2), 'fill', 'none', 'stroke', colour, 'stroke-width', n(width, 2),
			'stroke-dasharray', dash, 'stroke-dashoffset', offset]);
	}
	// deflectors: a small diamond or canoe on the stator, tangent to the track
	function deflectors(g, p) {
		var rd = (g.r2 + g.r3) / 2, len = 0.07 * R, wid = 0.024 * R, d = '';
		// half the length as an angle on the circle; the canoe's sides are arcs through the tips
		// with sagitta wid/2, so their radius is (chord²/4 + sagitta²) / (2·sagitta)
		var half = len / 2 / rd / DEG, bulge = (len * len / 4 + wid * wid / 4) / wid;
		for (var k = 0; k < g.defN; k++) {
			var th = g.defPhase + k * 360 / g.defN;
			if (g.canoe) {
				d += 'M' + pt(rd, th - half, p) + 'A' + n(bulge, p) + ' ' + n(bulge, p) + ' 0 0 1 ' + pt(rd, th + half, p) +
					'A' + n(bulge, p) + ' ' + n(bulge, p) + ' 0 0 1 ' + pt(rd, th - half, p) + 'Z';
			} else {
				d += 'M' + pt(rd, th - half, p) + 'L' + pt(rd + wid / 2, th, p) + 'L' + pt(rd, th + half, p) +
					'L' + pt(rd - wid / 2, th, p) + 'Z';
			}
		}
		return d;
	}
	// the crosshead: four arms from just outside the finial, in one of three styles
	function crosshead(g, w, metal, flat, p) {
		var fin = 0.035 * R, rs = 1.2 * fin, a = g.arm, s = '', d = '';
		// a taper is widest a third of the way out: 0.015R either side, as an angle at that radius
		var rm = rs + (a - rs) * 0.35, tw = 0.015 * R / rm / DEG;
		for (var k = 0; k < 4; k++) {
			var th = k * 90;
			if (g.armStyle === 1) {
				d += 'M' + pt(rs, th, p) + 'L' + pt(rm, th - tw, p) + 'L' + pt(a, th, p) +
					'L' + pt(rm, th + tw, p) + 'Z';
			} else {
				d += 'M' + pt(rs, th, p) + 'L' + pt(a, th, p);
			}
			s += el('circle', ['cx', n(a * Math.cos(th * DEG), p), 'cy', n(a * Math.sin(th * DEG), p), 'r', n(0.028 * R, p),
				'fill', flat ? metal : null]);
		}
		if (g.armStyle === 2) s += el('circle', ['r', n(a * 0.62, p), 'fill', 'none']);
		return el('g', ['stroke', metal, 'stroke-width', n(w, 2), 'stroke-linecap', 'round', 'stroke-linejoin', 'round',
			'fill', flat && g.armStyle === 1 ? metal : 'none'], el('path', ['d', d]) + s);
	}
	// the side of a cylinder of radius r between two plane-y levels: open, it is exactly the near
	// half-arc plus the two silhouettes; filled, it closes into the visible band. Exact at any tilt
	// and roll, because the tangent points are always x = ±r in plane space (spec: Tilted view).
	function ext(r, yTop, yBot, p) {
		return 'M' + n(-r, p) + ' ' + n(yTop, p) + 'L' + n(-r, p) + ' ' + n(yBot, p) +
			'A' + n(r, p) + ' ' + n(r, p) + ' 0 0 0 ' + n(r, p) + ' ' + n(yBot, p) + 'L' + n(r, p) + ' ' + n(yTop, p);
	}

	// The picture and the name of its pause variable. Motion names come from their own token
	// stream, so switching motion on never renames anything in the static picture.
	function render(opts) {
		var o = opts || {};
		var g = geometry(o), id = tokens(g.S, o.salt), mid = tokens(g.S, (o.salt || '') + '#m'), p = o.precision || 0;
		var sp = o.speed == null ? 1 : o.speed, mo = sp > 0 ? o.motion : false;
		var kR = mo === true || mo === 'rotor' ? mid() : null, kB = mo === true || mo === 'ball' ? mid() : null, kQ = kB ? mid() : null;
		// an animated group carries only its class — a transform attribute would be replaced by the
		// animation's — so the phase and every offset live on a child (ADR 006)
		var cls = function (k, inner) { return k ? el('g', ['class', k], inner) : inner; };
		var r = roles(o.brand, o.theme);
		var col = function (role) {
			var pin = o[role];
			return pin != null && pin !== 'auto' ? esc(pin) : toHex(r[role]);
		};
		var flat = o.style !== 'line', tilt = o.view !== 'top';
		var detail = o.detail == null ? 2 : o.detail;
		var lw = 6 * (o.weight == null ? 1 : o.weight);
		// the frame's margin: the asked-for pad plus half the outer rim's line, glow included, so a
		// heavy line style is never clipped at the edge (flat draws no stroke outside the rim)
		var N = g.N, pad = (o.pad == null ? 0.04 : o.pad) * R + (flat ? 0 : lw * 0.8 * (o.glow !== false ? 3.5 : 1));

		// ── the view: P = Rot(roll)·diag(1, cos tilt); a part at height z sits at plane-y −z·tan tilt
		var tl = tilt ? Math.min(60, Math.max(0, g.tilt)) : 0, ro = tilt ? g.roll : 0;
		var T = Math.tan(tl * DEG), cs = Math.cos(tl * DEG), cr = Math.cos(ro * DEG), sr = Math.sin(ro * DEG);
		var H = g.H, zT = H - 0.03 * R, zS = H - 0.06 * R, z3 = H - 0.1 * R, zC = z3 + g.rise, zK = zC + g.th;
		var y = function (z) { return n(-z * T, p); };
		var shift = function (z, inner) { return el('g', ['transform', tilt ? 'translate(0 ' + y(z) + ')' : null], inner); };
		// the screen-space light (upper left), carried back into the plane for the static gloss
		var lx = cr * -0.6 + sr * -0.8, ly = (-sr * -0.6 + cr * -0.8) / cs, ll = Math.sqrt(lx * lx + ly * ly);
		lx /= ll; ly /= ll;

		var defs = '', mono = function (fill, op) { return ['fill', fill, 'fill-opacity', op]; };
		var disc = function (rr, z, extra) { return el('circle', ['r', n(rr, p), 'cy', tilt ? y(z) : null].concat(extra || [])); };

		// the stroke: a three-stop gradient, unless the role is pinned
		var stroke;
		if (o.stroke != null && o.stroke !== 'auto') {
			stroke = esc(o.stroke);
		} else {
			var gid = id();
			defs += el('linearGradient', ['id', gid, 'gradientUnits', 'userSpaceOnUse', 'x1', -R, 'y1', -R, 'x2', R, 'y2', R],
				el('stop', ['offset', 0, 'stop-color', toHex(r.stroke[0])]) +
				el('stop', ['offset', 0.5, 'stop-color', toHex(r.stroke[1])]) +
				el('stop', ['offset', 1, 'stop-color', toHex(r.stroke[2])]));
			stroke = 'url(#' + gid + ')';
		}
		var metal = col('metal');

		// one aperture clip — the rim's inner edge at rim height — hides the near inner wall, the
		// near track, and the ball passing behind the near rim
		var cid = id();
		defs += el('clipPath', ['id', cid], disc(g.r1, H));
		var clip = function (inner) { return el('g', ['clip-path', 'url(#' + cid + ')'], inner); };

		// the rotor: everything that turns with the wheel, at its own height, rotated by the phase
		var turn = function (inner) { return cls(kR, el('g', ['transform', 'rotate(' + n(g.phase, 2) + ')'], inner)); };
		var rotor = function (inner) { return shift(z3, turn(inner)); };
		var pockets = function (rp, bw) {
			var L = 2 * Math.PI * rp / N;
			return ring(rp, bw, col('pocketA'), n(L, 2) + ' ' + n(L, 2), N === 37 ? n(L, 2) : 0) +
				ring(rp, bw, col('zero'), n(L, 2) + ' ' + n(L * (N === 37 ? 36 : 18), 2), 0);
		};
		var frets = function (w) {
			var rf = (g.r4 + g.r5) / 2, Lf = 2 * Math.PI * rf / N;
			return ring(rf, g.r4 - g.r5, metal, n(w, 2) + ' ' + n(Lf - w, 2), n(w / 2, 2));
		};
		// the ball: orbit, place on the track, counter-orbit, undo the view. The two rotations cancel
		// and so do the view and its inverse, so it stays a round ball with its highlight upper-left
		// whatever the roll — also while it runs round the track.
		var rb = (g.r1 + g.r2) / 2, inv = tilt ? ' matrix(' + [cr, -sr / cs, sr, cr / cs].map(function (v) { return n(v, 4); }).join(' ') + ' 0 0)' : '';
		var t1 = 'rotate(' + n(g.ball, 2) + ') translate(' + n(rb, p) + ' 0)', t2 = 'rotate(' + n(-g.ball, 2) + ')' + inv;
		var ball = function (inner) {
			return shift(zT, kB ? cls(kB, el('g', ['transform', t1], cls(kQ, el('g', ['transform', t2], inner)))) : el('g', ['transform', t1 + ' ' + t2], inner));
		};
		var body = '';

		if (flat) {
			var rim = col('rim'), track = col('track'), cone = col('cone');
			// the static gloss over the rotor: a radial highlight toward the light, never spinning
			var gl = id();
			defs += el('radialGradient', ['id', gl, 'cx', n(0.5 + 0.28 * lx, 2), 'cy', n(0.5 + 0.28 * ly, 2), 'r', 0.75],
				el('stop', ['offset', 0, 'stop-color', '#fff', 'stop-opacity', 0.16]) +
				el('stop', ['offset', 1, 'stop-color', '#fff', 'stop-opacity', 0]));
			if (tilt) {
				var band = ext(R, -H * T, 0, p);
				body += el('path', ['d', band, 'fill', rim]) + el('path', ['d', band].concat(mono('#000', 0.28)));
			}
			body += disc(R, H, ['fill', rim]);
			if (detail >= 2) {
				body += disc(R * 0.985, H, ['fill', 'none', 'stroke', '#fff', 'stroke-opacity', 0.12, 'stroke-width', n(lw, 2)]);
				for (var gi = 0; gi < g.grain.length; gi++) {
					body += disc(g.grain[gi][0], H, ['fill', 'none', 'stroke', g.grain[gi][1], 'stroke-opacity', n(g.grain[gi][2], 3), 'stroke-width', n(lw * 0.8, 2)]);
				}
			}
			body += disc(g.r1, H, ['fill', rim]) + disc(g.r1, H, mono('#000', 0.45));
			var bowl = disc(g.r1, zT, ['fill', track]) + disc(g.r1, zT, mono('#fff', 0.2)) +
				disc(g.r2, zS, ['fill', track]) + disc(g.r2, zS, mono('#fff', 0.08));
			if (detail >= 2) bowl += shift((zS + z3) / 2, el('path', ['d', deflectors(g, p), 'fill', metal]));
			var rot = el('circle', ['r', n(g.r3, p), 'fill', col('pocketB')]) + pockets((g.r3 + g.r5) / 2, g.r3 - g.r5) +
				el('circle', ['r', n((g.r4 + g.r5) / 2, 2), 'fill', 'none', 'stroke', '#000', 'stroke-opacity', 0.2, 'stroke-width', n(g.r4 - g.r5, 2)]);
			if (detail >= 2) {
				rot += frets(lw * 0.7) + el('circle', ['r', n(g.r4, p), 'fill', 'none', 'stroke', metal, 'stroke-width', n(lw * 0.6, 2)]);
			}
			rot += el('circle', ['r', n(g.r5, p), 'fill', cone]);
			bowl += rotor(rot) + disc(g.r3, z3, ['fill', 'url(#' + gl + ')']);
			// the cone climbs in three terraces toward the turret, each a little lighter
			for (var k = 1; k <= 2; k++) {
				bowl += disc(g.r5 * (1 - 0.34 * k), z3 + g.rise * k / 2, ['fill', cone]) +
					disc(g.r5 * (1 - 0.34 * k), z3 + g.rise * k / 2, mono('#fff', 0.1 * k));
			}
			bowl += ball(el('circle', ['r', n(0.026 * R, p), 'fill', col('ball')]) +
				el('circle', ['cx', n(-0.008 * R, p), 'cy', n(-0.009 * R, p), 'r', n(0.009 * R, p)].concat(mono('#fff', 0.6))));
			body += clip(bowl);
			if (tilt) {
				var col3 = ext(g.rt, -zK * T, -zC * T, p);
				body += el('path', ['d', col3, 'fill', metal]) + el('path', ['d', col3].concat(mono('#000', 0.25)));
			}
			body += disc(g.rt, zK, ['fill', metal]) + disc(g.rt, zK, mono('#fff', 0.2));
			body += shift(zK, turn(crosshead(g, lw * 2.2, metal, true, p)));
			body += disc(0.035 * R, zK, ['fill', metal]) + disc(0.035 * R, zK, mono('#fff', 0.3));
		} else {
			// static outlines in three weights — the rim and the pocket ring carry the drawing, the
			// bands between them only divide it. Each tier is one group so the glow can reuse it; the
			// part of a tier inside the bowl is clipped to the aperture.
			var tiers = [
				[1.6, (tilt ? el('path', ['d', ext(R, -H * T, 0, p)]) : '') + disc(R, H) + disc(g.r1, H), ''],
				[1, tilt ? el('path', ['d', ext(g.rt, -zK * T, -zC * T, p)]) + disc(g.rt, zK) : disc(g.rt, zK), disc(g.r4, z3) + disc(g.r5, z3)],
				[0.55, disc(R * 0.975, H), (tilt ? disc(g.r1, zT) : '') + disc(g.r2, zS) + disc(g.r3, z3) + disc(0.12 * R, zC)]
			];
			var passes = ['', ''];
			for (var i = 0; i < tiers.length; i++) {
				for (var half = 1; half <= 2; half++) {
					if (!tiers[i][half]) continue;
					var sid = id();
					defs += el('g', ['id', sid], tiers[i][half]);
					var use = function (w, op) { return el('use', ['href', '#' + sid, 'stroke', stroke, 'stroke-width', n(w, 2), 'opacity', op]); };
					if (o.glow !== false && i < 2) passes[0] += half === 2 ? clip(use(lw * tiers[i][0] * 3.5, 0.14)) : use(lw * tiers[i][0] * 3.5, 0.14);
					passes[1] += half === 2 ? clip(use(lw * tiers[i][0])) : use(lw * tiers[i][0]);
				}
			}
			body += passes[0] + passes[1];
			var inner = '';
			if (detail >= 2) inner += shift((zS + z3) / 2, el('path', ['d', deflectors(g, p), 'stroke', metal, 'stroke-width', n(lw, 2), 'stroke-linejoin', 'round']));
			var lrot = pockets((g.r4 + g.r5) / 2, (g.r4 - g.r5) * 0.5);
			if (detail >= 2) {
				var rf = (g.r3 + g.r5) / 2, Lf = 2 * Math.PI * rf / N, f = lw * 0.6;
				lrot += ring(rf, g.r3 - g.r5, stroke, n(f, 2) + ' ' + n(Lf - f, 2), n(f / 2, 2));
				var inl = '';
				for (var q = 0; q < g.inlays; q++) {
					var ang = q * 360 / g.inlays + 180 / g.inlays;
					inl += 'M' + pt(0.16 * R, ang, p) + 'L' + pt(g.r5 * 0.9, ang, p);
				}
				lrot += el('path', ['d', inl, 'stroke', stroke, 'stroke-width', n(lw * 0.7, 2), 'stroke-linecap', 'round']);
			}
			inner += rotor(lrot) + ball(el('circle', ['r', n(0.026 * R, p), 'fill', col('ball'), 'stroke', 'none']));
			body += clip(inner);
			body += shift(zK, turn(crosshead(g, lw * 1.3, metal, false, p)));
			body += disc(0.035 * R, zK, ['stroke', metal, 'stroke-width', n(lw * 1.3, 2)]);
		}

		// framing: the screen box of the rim's top and bottom circles and the crosshead's reach
		var hx = Math.sqrt(cr * cr + sr * sr * cs * cs), hy = Math.sqrt(sr * sr + cr * cr * cs * cs);
		var box = [Infinity, Infinity, -Infinity, -Infinity];
		[[R, 0], [R, -H * T], [g.arm + 0.03 * R, -zK * T]].forEach(function (c) {
			var sx = -sr * cs * c[1], sy = cr * cs * c[1];
			box = [Math.min(box[0], sx - c[0] * hx), Math.min(box[1], sy - c[0] * hy),
				Math.max(box[2], sx + c[0] * hx), Math.max(box[3], sy + c[0] * hy)];
		});
		var w = box[2] - box[0], h = box[3] - box[1], mx = (box[0] + box[2]) / 2, my = (box[1] + box[3]) / 2;
		if (o.fit !== 'tight') w = h = Math.max(w, h);
		var vb = [mx - w / 2 - pad, my - h / 2 - pad, w + 2 * pad, h + 2 * pad].map(function (v) { return n(v); }).join(' ');

		var view = tilt ? 'matrix(' + [cr, sr, -sr * cs, cr * cs].map(function (v) { return n(v, 4); }).join(' ') + ' 0 0)' : null;
		// motion: one keyframe for every group; rotor and ball run opposite ways, the counter-orbit
		// mirrors the orbit. An inline <style> is document-global, so every name is a seeded token
		// and there is no type or universal selector.
		var css = '', pv = null;
		if (kR || kB) {
			var kf = mid();
			pv = mid();
			var rule = function (k, t, rev) {
				return '.' + k + '{animation:' + kf + ' ' + n(t / sp, 2) + 's linear infinite' + (rev ? ' reverse' : '') +
					';transform-origin:0 0;animation-play-state:var(--' + pv + ',running)}';
			};
			if (kR) css += rule(kR, g.tr, g.dir < 0);
			if (kB) css += rule(kB, g.tb, g.dir > 0) + rule(kQ, g.tb, g.dir < 0);
			css += '@keyframes ' + kf + '{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){' +
				[kR, kB, kQ].filter(Boolean).map(function (k) { return '.' + k; }).join(',') + '{animation:none}}';
			css = el('style', [], css);
		}

		var a11y = o.title ? ['role', 'img', 'aria-label', esc(o.title)] : ['aria-hidden', 'true'];
		return {
			s: el('svg', ['xmlns', NS, 'viewBox', vb,
				'width', o.size == null ? null : n(o.size), 'height', o.size == null ? null : n(o.size)].concat(a11y),
			css + el('defs', [], defs) + el('g', ['transform', view, 'fill', flat ? null : 'none'], body)),
			p: pv
		};
	}

	function svg(opts) { return render(opts).s; }

	// The wheel as an emblem (spec: Mark, ADR 012): a rim, one ring of segments, a hub, maybe the
	// crosshead's bars — what still reads at 16 px. Seeded from mark:* streams of its own, so adding
	// it moved no byte of svg(). No ids, defs or style: nothing to collide, nothing to sign. A mono
	// mark is all currentColor, so a backplate would swallow it; badge applies to colour only.
	function mark(opts) {
		var o = opts || {}, S = streams(o.seed == null ? 1 : o.seed), r = roles(o.brand, o.theme);
		var mono = !!o.mono, badge = !!o.badge && !mono;
		var col = function (role) {
			var pin = o[role];
			return mono ? 'currentColor' : pin != null && pin !== 'auto' ? esc(pin) : toHex(r[role]);
		};
		var N = [8, 10, 12, 16][Math.floor(S('mark:segments')() * 4)], L = 2 * Math.PI * 19 / N;
		var hub = Math.floor(S('mark:hub')() * 3), metal = col('metal');
		var ring = function (stroke, dash, off) {
			return el('circle', ['cx', 32, 'cy', 32, 'r', 19, 'fill', 'none', 'stroke', stroke, 'stroke-width', 12,
				'stroke-dasharray', dash, 'stroke-dashoffset', off]);
		};
		var plate = badge ? (S('mark:plate')() < 0.5 ? el('circle', ['cx', 32, 'cy', 32, 'r', 32, 'fill', col('rim')])
			: el('rect', ['width', 64, 'height', 64, 'rx', 14, 'fill', col('rim')])) : '';
		var g = el('circle', ['cx', 32, 'cy', 32, 'r', 28, 'fill', 'none', 'stroke', badge ? col('pocketB') : col('rim'), 'stroke-width', 5]);
		if (!mono) g += ring(col('pocketB'));
		g += ring(col('pocketA'), n(L, 2) + ' ' + n(L, 2));
		if (!mono) g += ring(col('zero'), n(L, 2) + ' ' + n(L * (N - 1), 2), n(L, 2));
		if (S('mark:arms')() < 0.6) g += el('path', ['d', 'M32 18V46M18 32H46', 'fill', 'none', 'stroke', metal, 'stroke-width', 3.5, 'stroke-linecap', 'round']);
		g += hub === 0 ? el('circle', ['cx', 32, 'cy', 32, 'r', 6, 'fill', metal])
			: hub === 1 ? el('circle', ['cx', 32, 'cy', 32, 'r', 7, 'fill', 'none', 'stroke', metal, 'stroke-width', 3])
				: el('path', ['d', 'M32 25 39 32 32 39 25 32Z', 'fill', metal]);
		var a11y = o.title ? ['role', 'img', 'aria-label', esc(o.title)] : ['aria-hidden', 'true'];
		return el('svg', ['xmlns', NS, 'viewBox', '0 0 64 64',
			'width', o.size == null ? null : n(o.size), 'height', o.size == null ? null : n(o.size)].concat(a11y),
		plate + el('g', ['transform', 'rotate(' + n(S('mark:turn')() * 360 / N, 2) + ' 32 32)'], g));
	}

	// Browser convenience: draw into an element and keep it drawn. Pins stay pinned across set()
	// because options merge; a moving wheel sleeps off screen through its pause variable — the
	// sibling rule, with no animation loop of its own to stop.
	function init(target, opts) {
		var host = typeof target === 'string' ? document.querySelector(target) : target;
		if (!host) return null;
		var cur = {}, io = null, pv = null, seen = true, dead = false;
		var paint = function () {
			if (pv) host.style.removeProperty('--' + pv);
			var r = render(cur);
			host.innerHTML = r.s;
			pv = r.p;
			if (pv && !seen) host.style.setProperty('--' + pv, 'paused');
		};
		var set = function (o) {
			for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) cur[k] = o[k];
			paint();
		};
		set(opts || {});
		if (typeof IntersectionObserver !== 'undefined') {
			io = new IntersectionObserver(function (entries) {
				// a notification already queued when destroy() ran must not touch the host again
				if (dead) return;
				seen = entries[entries.length - 1].isIntersecting;
				if (pv) host.style.setProperty('--' + pv, seen ? 'running' : 'paused');
			});
			io.observe(host);
		}
		return {
			el: host,
			get: function () { var c = {}; for (var k in cur) if (Object.prototype.hasOwnProperty.call(cur, k)) c[k] = cur[k]; return c; },
			set: set,
			destroy: function () { dead = true; if (io) io.disconnect(); if (pv) host.style.removeProperty('--' + pv); host.innerHTML = ''; }
		};
	}

	return { svg: svg, mark: mark, palette: palette, init: init };
});
