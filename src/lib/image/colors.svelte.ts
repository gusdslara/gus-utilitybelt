// Cores: conversões (hex/RGB/HSV/HSL), cor primária/secundária (estilo Paint.NET), recentes e paletas salvas.
export type RGBA = { r: number; g: number; b: number; a: number }; // r,g,b 0..255, a 0..1
export type HSV = { h: number; s: number; v: number }; // h 0..360, s/v 0..1

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const hex2 = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');

export function parseColor(input: string): RGBA | null {
	const s = input.trim().toLowerCase();
	let m = /^#?([0-9a-f]{3,8})$/.exec(s);
	if (m) {
		let h = m[1];
		if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
		if (h.length !== 6 && h.length !== 8) return null;
		const n = parseInt(h.slice(0, 6), 16);
		return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
	}
	m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(s);
	if (m) {
		const a = m[4] ? (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])) : 1;
		return { r: +m[1], g: +m[2], b: +m[3], a: clamp(a, 0, 1) };
	}
	m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(s);
	if (m) {
		const a = m[4] ? (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])) : 1;
		return { ...hslToRgb(+m[1], +m[2] / 100, +m[3] / 100), a: clamp(a, 0, 1) };
	}
	return null;
}

export function toHex(c: RGBA, withAlpha = c.a < 1): string {
	return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${withAlpha ? hex2(c.a * 255) : ''}`;
}

export function toCss(c: RGBA): string {
	return c.a >= 1 ? toHex(c, false) : `rgb(${Math.round(c.r)} ${Math.round(c.g)} ${Math.round(c.b)} / ${+c.a.toFixed(3)})`;
}

export function rgbToHsv({ r, g, b }: RGBA): HSV {
	r /= 255; g /= 255; b /= 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
	let h = 0;
	if (d) {
		if (max === r) h = ((g - b) / d) % 6;
		else if (max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h *= 60;
		if (h < 0) h += 360;
	}
	return { h, s: max ? d / max : 0, v: max };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
	const f = (n: number) => {
		const k = (n + h / 60) % 6;
		return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
	};
	return { r: f(5) * 255, g: f(3) * 255, b: f(1) * 255 };
}

export function hslToRgb(h: number, s: number, l: number) {
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
	};
	return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 };
}

export function rgbToHsl({ r, g, b }: RGBA) {
	r /= 255; g /= 255; b /= 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	const l = (max + min) / 2, d = max - min;
	const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
	const { h } = rgbToHsv({ r: r * 255, g: g * 255, b: b * 255, a: 1 });
	return { h, s, l };
}

/** Contraste para texto sobre a cor (preto ou branco). */
export function readableOn(c: RGBA) {
	const lum = (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255;
	return lum > 0.55 || c.a < 0.4 ? '#111' : '#fff';
}

// Paleta padrão (inspirada nas paletas clássicas de 2 linhas de editores de pintura).
export const DEFAULT_PALETTE = [
	'#000000', '#404040', '#808080', '#c0c0c0', '#ffffff', '#7f0000', '#ff0000', '#ff6a00', '#ffd800', '#b6ff00',
	'#4cff00', '#00ff21', '#00ff90', '#00ffff', '#0094ff', '#0026ff', '#4800ff', '#b200ff', '#ff00dc', '#ff006e',
	'#dd206b', '#7c5cff', '#3ddc97', '#ffb547', '#1b1038', '#0c2a3a', '#2a0f22', '#f4e1c1', '#8d5524', '#c68642'
];

const LS_KEY = 'ub_image_colors';

class ColorState {
	primary = $state<RGBA>({ r: 0, g: 0, b: 0, a: 1 });
	secondary = $state<RGBA>({ r: 255, g: 255, b: 255, a: 1 });
	recent = $state<string[]>([]);
	palette = $state<string[]>([...DEFAULT_PALETTE]);
	/** Qual das duas cores o seletor está editando. */
	editing = $state<'primary' | 'secondary'>('primary');

	get primaryCss() {
		return toCss(this.primary);
	}
	get secondaryCss() {
		return toCss(this.secondary);
	}

	load() {
		try {
			const d = JSON.parse(localStorage.getItem(LS_KEY) ?? 'null');
			if (d?.palette?.length) this.palette = d.palette;
			if (d?.recent) this.recent = d.recent;
			if (d?.primary) this.primary = d.primary;
			if (d?.secondary) this.secondary = d.secondary;
		} catch {
			/* storage indisponível */
		}
	}

	save() {
		try {
			localStorage.setItem(LS_KEY, JSON.stringify({ palette: this.palette, recent: this.recent, primary: this.primary, secondary: this.secondary }));
		} catch {
			/* sem storage */
		}
	}

	set(which: 'primary' | 'secondary', c: RGBA) {
		this[which] = { ...c };
	}

	/** Registra a cor como usada (recentes, máx. 16). */
	use(c: RGBA) {
		const h = toHex(c);
		this.recent = [h, ...this.recent.filter((x) => x !== h)].slice(0, 16);
		this.save();
	}

	swap() {
		[this.primary, this.secondary] = [this.secondary, this.primary];
		this.save();
	}

	reset() {
		this.primary = { r: 0, g: 0, b: 0, a: 1 };
		this.secondary = { r: 255, g: 255, b: 255, a: 1 };
		this.save();
	}

	addToPalette(c: RGBA) {
		const h = toHex(c);
		if (!this.palette.includes(h)) this.palette = [...this.palette, h];
		this.save();
	}

	removeFromPalette(h: string) {
		this.palette = this.palette.filter((x) => x !== h);
		this.save();
	}

	resetPalette() {
		this.palette = [...DEFAULT_PALETTE];
		this.save();
	}
}

export const colors = new ColorState();
