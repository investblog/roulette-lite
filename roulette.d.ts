// Types for roulette-lite. The contract is docs/README.md; this file mirrors its Options and API.
// `export =` because the package is CommonJS (ADR 007): use the default import,
// `import Roulette from 'roulette-lite'`.

declare namespace Roulette {
	/** Any CSS colour string: hex, rgb(), or var(--x, #fallback). Never parsed, only escaped. */
	type Colour = string;
	type Pin = Colour | 'auto';

	interface Options {
		/** Spins the geometry: a string (a domain name is fine), or a number taken as a 32-bit unsigned integer. Default 1. */
		seed?: number | string;
		/** Spins the colours: one hex or up to three. Default: the spintax triad. */
		brand?: string | string[];
		theme?: 'dark' | 'light';
		style?: 'line' | 'flat';
		view?: 'top' | 'tilt';
		variant?: 'european' | 'american' | 'auto';
		/** 1 silhouette · 2 frets, deflectors, grain · 3 reserved (draws as 2). Default 2. */
		detail?: 1 | 2 | 3;
		weight?: number;
		glow?: boolean;
		motion?: boolean | 'rotor' | 'ball';
		/** Period divisor; 0 = static. */
		speed?: number;
		/** Degrees; 'auto' = seeded. */
		tilt?: number | 'auto';
		roll?: number | 'auto';
		phase?: number | 'auto';
		pocketA?: Pin;
		pocketB?: Pin;
		zero?: Pin;
		rim?: Pin;
		track?: Pin;
		cone?: Pin;
		metal?: Pin;
		ball?: Pin;
		stroke?: Pin;
		size?: number;
		fit?: 'square' | 'tight';
		pad?: number;
		precision?: number;
		/** Extra entropy for ids: two wheels with one seed on one page. */
		salt?: string;
		/** Makes the picture an image with this accessible name; otherwise aria-hidden. */
		title?: string;
	}

	interface MarkOptions {
		seed?: number | string;
		brand?: string | string[];
		theme?: 'dark' | 'light';
		/** Everything in currentColor — a logo that follows the text colour. Ignores badge. */
		mono?: boolean;
		/** A seeded backplate (circle or rounded square) in the body colour — for a favicon. */
		badge?: boolean;
		pocketA?: Pin;
		pocketB?: Pin;
		zero?: Pin;
		rim?: Pin;
		metal?: Pin;
		size?: number;
		title?: string;
	}

	interface Palette {
		pocketA: string;
		pocketB: string;
		zero: string;
		rim: string;
		track: string;
		cone: string;
		metal: string;
		ball: string;
		stroke: string[];
		background: string;
		halo: string;
	}

	interface Handle {
		el: Element;
		get(): Options;
		set(opts: Options): void;
		destroy(): void;
	}
}

declare const Roulette: {
	/** Pure: the SVG markup as a string. Runs in Node and in the browser. */
	svg(opts?: Roulette.Options): string;
	/** Pure: the wheel as an emblem, 64×64 — a logo glyph or a favicon. */
	mark(opts?: Roulette.MarkOptions): string;
	palette(brand?: string | string[], opts?: { theme?: 'dark' | 'light' }): Roulette.Palette;
	/** Browser only. Returns null when the selector matches nothing. */
	init(target: string | Element, opts?: Roulette.Options): Roulette.Handle | null;
};

export = Roulette;
