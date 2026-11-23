// Ferramentas puras para arquivos Lottie (JSON bodymovin 5.x) e dotLottie (.lottie = zip).
// Funcionam com arquivos de terceiros: nada aqui assume o formato do nosso gerador (`toLottie`).
// Sem DOM: roda no navegador, em worker e no Bun (testes). As funções de edição MUTAM o objeto
// recebido e o devolvem (para desfazer, a UI guarda um `structuredClone` antes).
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import type { LottieJSON } from './types.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

// =====================================================================
// Leitura / escrita de arquivos
// =====================================================================

export type ParsedLottie = { json: LottieJSON; name: string; sourceKind: 'json' | 'lottie'; extraAnimations: number };

/** Lê um `.json` (Lottie) ou `.lottie` (dotLottie v1/v2). Imagens do .lottie viram data URL embutida. */
export async function parseLottieFile(file: Blob, name?: string): Promise<ParsedLottie> {
	const fileName = name ?? (file as File).name ?? 'animacao';
	const base = fileName.replace(/\.[^.]+$/, '') || 'animacao';
	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!bytes.length) throw new Error('Arquivo vazio.');
	const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
	if (isZip) return parseDotLottie(bytes, base, name !== undefined || !!(file as File).name);
	if (/\.lottie$/i.test(fileName)) throw new Error('Arquivo .lottie inválido: não é um zip.');
	let data: unknown;
	try {
		data = JSON.parse(strFromU8(stripBom(bytes)));
	} catch {
		throw new Error('O arquivo não é um JSON válido.');
	}
	assertLottie(data);
	return { json: data, name: base, sourceKind: 'json', extraAnimations: 0 };
}

function stripBom(b: Uint8Array) {
	return b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf ? b.subarray(3) : b;
}

/** Lança erro amigável se o objeto não parece um Lottie. */
export function assertLottie(data: unknown): asserts data is LottieJSON {
	if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('O JSON não é uma animação Lottie (esperado um objeto).');
	const d = data as Record<string, unknown>;
	const missing = ['v', 'fr', 'ip', 'op', 'w', 'h', 'layers'].filter((k) => !(k in d));
	if (missing.length) throw new Error(`O JSON não parece uma animação Lottie (faltam: ${missing.join(', ')}).`);
	if (!Array.isArray(d.layers)) throw new Error('Lottie inválido: "layers" precisa ser uma lista.');
	for (const k of ['fr', 'ip', 'op', 'w', 'h'] as const) {
		if (typeof d[k] !== 'number' || !Number.isFinite(d[k])) throw new Error(`Lottie inválido: "${k}" precisa ser um número.`);
	}
}

function parseDotLottie(bytes: Uint8Array, base: string, hasName: boolean): ParsedLottie {
	let files: Record<string, Uint8Array>;
	try {
		files = unzipSync(bytes);
	} catch {
		throw new Error('Não foi possível abrir o .lottie (zip corrompido).');
	}
	// Normaliza caminhos (alguns geradores põem "./" ou "\").
	const byPath = new Map<string, Uint8Array>();
	for (const [p, b] of Object.entries(files)) byPath.set(p.replace(/\\/g, '/').replace(/^\.?\//, ''), b);

	let manifest: Any = null;
	const mf = byPath.get('manifest.json');
	if (mf) {
		try {
			manifest = JSON.parse(strFromU8(stripBom(mf)));
		} catch {
			manifest = null;
		}
	}
	const animFiles = [...byPath.keys()].filter((p) => /^(animations|a)\/[^/]+\.json$/i.test(p));
	const ids: string[] = Array.isArray(manifest?.animations) ? manifest.animations.map((a: Any) => String(a?.id ?? '')).filter(Boolean) : [];
	let path: string | undefined;
	for (const id of ids) {
		path = animFiles.find((p) => p.replace(/^[^/]+\//, '').replace(/\.json$/i, '') === id);
		if (path) break;
	}
	path ??= animFiles[0];
	if (!path) throw new Error('O .lottie não contém nenhuma animação (pasta animations/ vazia).');
	let json: unknown;
	try {
		json = JSON.parse(strFromU8(stripBom(byPath.get(path)!)));
	} catch {
		throw new Error(`A animação ${path} dentro do .lottie não é um JSON válido.`);
	}
	assertLottie(json);

	// Embute imagens referenciadas (images/ no v1, i/ no v2).
	const images = new Map<string, Uint8Array>();
	for (const [p, b] of byPath) {
		const m = /^(?:images|i)\/(.+)$/i.exec(p);
		if (m) images.set(m[1], b);
	}
	for (const a of json.assets ?? []) {
		if (!a || typeof a.p !== 'string' || a.layers || a.p.startsWith('data:')) continue;
		const key = a.p.replace(/^.*\//, '');
		const b = images.get(a.p) ?? images.get(key);
		if (!b) continue;
		a.p = `data:${mimeFromName(key, b)};base64,${toBase64(b)}`;
		a.u = '';
		a.e = 1;
	}
	const animId = path.replace(/^[^/]+\//, '').replace(/\.json$/i, '');
	const count = Math.max(animFiles.length, ids.length, 1);
	return { json, name: hasName ? base : animId || base, sourceKind: 'lottie', extraAnimations: count - 1 };
}

const MIME_EXT: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp',
	'image/gif': 'gif',
	'image/svg+xml': 'svg',
	'image/avif': 'avif'
};

function mimeFromName(name: string, b?: Uint8Array): string {
	const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase();
	if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
	if (ext === 'svg') return 'image/svg+xml';
	if (ext && Object.values(MIME_EXT).includes(ext)) return `image/${ext}`;
	if (b && b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
	if (b && b[0] === 0x52 && b[1] === 0x49) return 'image/webp';
	if (b && b[0] === 0x47 && b[1] === 0x49) return 'image/gif';
	return 'image/png';
}

function toBase64(b: Uint8Array): string {
	let s = '';
	for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
	return btoa(s);
}

function fromBase64(s: string): Uint8Array {
	const bin = atob(s);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

/** Slug seguro para id de animação no manifest. */
function slug(name: string): string {
	return (
		name
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 64) || 'animation'
	);
}

/** Gera um dotLottie v1. Imagens embutidas (data URL) vão para images/ e o JSON passa a referenciá-las. */
export async function writeDotLottie(json: LottieJSON, name: string): Promise<Blob> {
	const id = slug(name);
	const data: LottieJSON = structuredClone(json);
	const zip: Zippable = {};
	let n = 0;
	for (const a of data.assets ?? []) {
		if (!a || typeof a.p !== 'string' || a.layers) continue;
		const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(a.p);
		if (!m) continue;
		const mime = (m[1] || 'image/png').toLowerCase();
		const bytes = m[2] ? fromBase64(m[3]) : strToU8(decodeURIComponent(m[3]));
		const file = `img_${n++}.${MIME_EXT[mime] ?? 'png'}`;
		zip[`images/${file}`] = [bytes, { level: 0 }]; // imagens já são comprimidas
		a.u = '/images/';
		a.p = file;
		a.e = 0;
	}
	const manifest = {
		version: '1',
		generator: 'gus-utilitybelt',
		author: 'gus-utilitybelt',
		animations: [{ id, speed: 1, loop: true, autoplay: true }]
	};
	zip['manifest.json'] = strToU8(JSON.stringify(manifest));
	zip[`animations/${id}.json`] = strToU8(JSON.stringify(data));
	const out = zipSync(zip, { level: 9 });
	return new Blob([out as BlobPart], { type: 'application/zip' });
}

// =====================================================================
// Camadas (caminhos: '3' = json.layers[3]; 'asset:comp_0/2' = asset comp_0, layers[2])
// =====================================================================

export type LayerKind = 'shape' | 'text' | 'image' | 'precomp' | 'solid' | 'null' | 'other';
export type LayerEntry = { path: string; name: string; type: LayerKind; hidden: boolean; ip: number; op: number; depth: number };

const KIND: Record<number, LayerKind> = { 0: 'precomp', 1: 'solid', 2: 'image', 3: 'null', 4: 'shape', 5: 'text' };

function findAsset(json: LottieJSON, id: string): Any | undefined {
	return (json.assets ?? []).find((a: Any) => a && a.id === id);
}

function resolvePath(json: LottieJSON, path: string): { list: Any[]; index: number } {
	let list: Any[] | undefined;
	let idx: string;
	if (path.startsWith('asset:')) {
		const rest = path.slice(6);
		const cut = rest.lastIndexOf('/');
		if (cut < 0) throw new Error(`Caminho de camada inválido: ${path}`);
		list = findAsset(json, rest.slice(0, cut))?.layers;
		idx = rest.slice(cut + 1);
	} else {
		list = json.layers;
		idx = path;
	}
	const index = Number(idx);
	if (!Array.isArray(list) || !Number.isInteger(index) || index < 0 || index >= list.length) throw new Error(`Camada não encontrada: ${path}`);
	return { list, index };
}

export function getLayer(json: LottieJSON, path: string): Any {
	const { list, index } = resolvePath(json, path);
	return list[index];
}

/** Árvore achatada (ordem de desenho do Lottie: o primeiro fica por cima). Precomps expandem seus filhos uma vez. */
export function listLayers(json: LottieJSON): LayerEntry[] {
	const out: LayerEntry[] = [];
	const expanded = new Set<string>();
	const walk = (layers: Any[], prefix: string, depth: number, stack: string[]) => {
		layers.forEach((l, i) => {
			if (!l || typeof l !== 'object') return;
			const path = prefix + i;
			out.push({
				path,
				name: typeof l.nm === 'string' && l.nm ? l.nm : `Camada ${i + 1}`,
				type: KIND[l.ty] ?? 'other',
				hidden: !!l.hd,
				ip: Number(l.ip) || 0,
				op: Number(l.op) || 0,
				depth
			});
			if (l.ty === 0 && typeof l.refId === 'string' && !stack.includes(l.refId) && !expanded.has(l.refId)) {
				const asset = findAsset(json, l.refId);
				if (Array.isArray(asset?.layers)) {
					expanded.add(l.refId);
					walk(asset.layers, `asset:${l.refId}/`, depth + 1, [...stack, l.refId]);
				}
			}
		});
	};
	walk(json.layers, '', 0, []);
	return out;
}

export function setLayerHidden(json: LottieJSON, path: string, hidden: boolean): LottieJSON {
	const l = getLayer(json, path);
	if (hidden) l.hd = true;
	else delete l.hd;
	return json;
}

/** Remove a camada. Filhos (parent) perdem o vínculo; a camada seguinte perde a máscara (track matte) se ela era a matte. */
export function removeLayer(json: LottieJSON, path: string): LottieJSON {
	const { list, index } = resolvePath(json, path);
	const [removed] = list.splice(index, 1);
	if (removed?.ind !== undefined) {
		for (const l of list) {
			if (l && l.parent === removed.ind) delete l.parent;
			if (l && l.tp === removed.ind) {
				delete l.tp;
				delete l.tt;
			}
		}
	}
	// Matte clássica: a camada com td=1 serve a próxima da lista (que tem tt).
	if (removed?.td && list[index]?.tt && list[index]?.tp === undefined) delete list[index].tt;
	return json;
}

/** Todas as listas de camadas (raiz + precomps), sem repetir. */
function allLayerLists(json: LottieJSON): { prefix: string; layers: Any[] }[] {
	const lists = [{ prefix: '', layers: json.layers }];
	for (const a of json.assets ?? []) if (a && Array.isArray(a.layers)) lists.push({ prefix: `asset:${a.id}/`, layers: a.layers });
	return lists;
}

// =====================================================================
// Cores
// =====================================================================

type RGB = [number, number, number];
/** Um lugar onde há uma cor: lê/escreve em 8 bits. */
type ColorSlot = { get(): RGB; set(c: RGB): void };

const clamp8 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/** Cor em array numérico (0..1, ou 0..255 em arquivos muito antigos) a partir do índice `o`. */
function arraySlot(arr: number[], o: number): ColorSlot | null {
	if (!Array.isArray(arr) || arr.length < o + 3) return null;
	if (![0, 1, 2].every((k) => typeof arr[o + k] === 'number')) return null;
	const big = arr[o] > 1 || arr[o + 1] > 1 || arr[o + 2] > 1;
	return {
		get: () => [0, 1, 2].map((k) => clamp8(big ? arr[o + k] : arr[o + k] * 255)) as RGB,
		set: (c) => {
			for (let k = 0; k < 3; k++) arr[o + k] = big ? c[k] : Math.round((c[k] / 255) * 10000) / 10000;
		}
	};
}

function isKeyframes(k: unknown): k is Any[] {
	return Array.isArray(k) && k.length > 0 && typeof k[0] === 'object' && k[0] !== null;
}

/** Propriedade de cor animável `{a, k}`: estática ou keyframes (`s`/`e`). */
function propSlots(prop: Any, out: ColorSlot[]) {
	if (!prop || typeof prop !== 'object') return;
	const k = prop.k;
	if (isKeyframes(k)) {
		for (const kf of k) {
			for (const key of ['s', 'e'] as const) {
				const s = kf && arraySlot(kf[key], 0);
				if (s) out.push(s);
			}
		}
	} else {
		const s = arraySlot(k, 0);
		if (s) out.push(s);
	}
}

/** Gradiente `g: { p: nStops, k: prop }`: paradas [pos, r, g, b] * p, depois opacidades. */
function gradientSlots(g: Any, out: ColorSlot[]) {
	if (!g || typeof g !== 'object' || !g.k) return;
	const p = Number(g.p) || 0;
	const each = (arr: number[]) => {
		if (!Array.isArray(arr)) return;
		const n = p || Math.floor(arr.length / 4);
		for (let j = 0; j < n; j++) {
			const s = arraySlot(arr, j * 4 + 1);
			if (s) out.push(s);
		}
	};
	if (isKeyframes(g.k.k)) for (const kf of g.k.k) (each(kf?.s), each(kf?.e));
	else each(g.k.k);
}

function shapeSlots(items: Any[], out: ColorSlot[]) {
	if (!Array.isArray(items)) return;
	for (const it of items) {
		if (!it || typeof it !== 'object') continue;
		if (it.ty === 'gr') shapeSlots(it.it, out);
		else if (it.ty === 'fl' || it.ty === 'st') propSlots(it.c, out);
		else if (it.ty === 'gf' || it.ty === 'gs') gradientSlots(it.g, out);
	}
}

function hexSlot(obj: Any, key: string): ColorSlot | null {
	const v = obj?.[key];
	if (typeof v !== 'string' || !/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v.trim())) return null;
	return {
		get: () => hexToRgb(v),
		set: (c) => {
			obj[key] = rgbToHex(c);
		}
	};
}

function colorSlots(json: LottieJSON): ColorSlot[] {
	const out: ColorSlot[] = [];
	for (const { layers } of allLayerLists(json)) {
		for (const l of layers) {
			if (!l || typeof l !== 'object') continue;
			if (l.ty === 4) shapeSlots(l.shapes, out);
			if (l.ty === 1) {
				const s = hexSlot(l, 'sc');
				if (s) out.push(s);
			}
			if (l.ty === 5 && l.t) {
				const dk = l.t.d?.k;
				if (Array.isArray(dk)) {
					for (const kf of dk) {
						for (const key of ['fc', 'sc'] as const) {
							const s = kf?.s && arraySlot(kf.s[key], 0);
							if (s) out.push(s);
						}
					}
				}
				for (const an of Array.isArray(l.t.a) ? l.t.a : []) {
					propSlots(an?.a?.fc, out);
					propSlots(an?.a?.sc, out);
				}
			}
			// Efeitos (Fill, Tint, etc.): parâmetros do tipo cor (ty 2).
			for (const ef of Array.isArray(l.ef) ? l.ef : []) {
				for (const p of Array.isArray(ef?.ef) ? ef.ef : []) if (p?.ty === 2) propSlots(p.v, out);
			}
		}
	}
	return out;
}

export function hexToRgb(hex: string): RGB {
	let h = hex.trim().replace(/^#/, '');
	if (h.length === 3 || h.length === 4) h = h.slice(0, 3).replace(/./g, (c) => c + c);
	const n = parseInt(h.slice(0, 6), 16);
	if (!Number.isFinite(n)) return [0, 0, 0];
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(c: RGB): string {
	return '#' + c.map((v) => clamp8(v).toString(16).padStart(2, '0')).join('');
}

/** Normaliza para '#rrggbb' minúsculo (alfa descartado). */
export function normalizeHex(hex: string): string {
	return rgbToHex(hexToRgb(hex));
}

/** Cores usadas (preenchimentos, traços, gradientes, sólidos, textos, efeitos), mais usadas primeiro. */
export function extractColors(json: LottieJSON): { key: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const s of colorSlots(json)) {
		const key = rgbToHex(s.get());
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return [...counts].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/** Troca uma cor em todos os lugares (comparação exata em 8 bits). Alfa e formato originais são preservados. */
export function replaceColor(json: LottieJSON, fromHex: string, toHex: string): LottieJSON {
	const from = normalizeHex(fromHex);
	const to = hexToRgb(toHex);
	for (const s of colorSlots(json)) if (rgbToHex(s.get()) === from) s.set(to);
	return json;
}

// =====================================================================
// Textos
// =====================================================================

export type TextEntry = { path: string; layerName: string; text: string; keyframes: number };

export function listTexts(json: LottieJSON): TextEntry[] {
	const out: TextEntry[] = [];
	for (const { prefix, layers } of allLayerLists(json)) {
		layers.forEach((l: Any, i: number) => {
			if (l?.ty !== 5) return;
			const k = l.t?.d?.k;
			if (!Array.isArray(k) || !k.length) return;
			out.push({ path: prefix + i, layerName: l.nm || `Texto ${i + 1}`, text: String(k[0]?.s?.t ?? '').replace(/\r/g, '\n'), keyframes: k.length });
		});
	}
	return out;
}

/** Troca o texto da camada (todos os keyframes do documento, ou só `keyframe`). Quebras de linha viram '\r' (padrão Lottie). */
export function setText(json: LottieJSON, path: string, text: string, keyframe?: number): LottieJSON {
	const l = getLayer(json, path);
	if (l?.ty !== 5) throw new Error('A camada não é de texto.');
	const k = l.t?.d?.k;
	if (!Array.isArray(k)) throw new Error('Camada de texto sem documento.');
	const t = text.replace(/\r\n|\n/g, '\r');
	k.forEach((kf: Any, i: number) => {
		if ((keyframe === undefined || keyframe === i) && kf?.s) kf.s.t = t;
	});
	return json;
}

// =====================================================================
// Tempo e tamanho
// =====================================================================

/** Acelera/desacelera mudando só o `fr`: os frames continuam os mesmos, a duração muda (2 = 2x mais rápido). */
export function setSpeed(json: LottieJSON, factor: number): LottieJSON {
	if (!(factor > 0) || !Number.isFinite(factor)) throw new Error('Fator de velocidade inválido.');
	json.fr = round4(json.fr * factor);
	return json;
}

const round4 = (v: number) => Math.round(v * 10000) / 10000;

/** Muda o FPS mantendo a duração: reescala todos os tempos (ip/op/st das camadas, keyframes, marcadores). */
export function setFps(json: LottieJSON, fps: number): LottieJSON {
	if (!(fps > 0) || !Number.isFinite(fps)) throw new Error('FPS inválido.');
	const f = fps / json.fr;
	if (f === 1) return json;
	const sc = (v: Any): Any => (typeof v === 'number' ? round4(v * f) : v);
	const seen = new Set<object>();
	const walk = (o: Any) => {
		if (!o || typeof o !== 'object' || seen.has(o)) return;
		seen.add(o);
		if (Array.isArray(o)) {
			for (const x of o) walk(x);
			return;
		}
		for (const [key, v] of Object.entries(o)) {
			// Keyframes: lista de objetos com `t` numérico (propriedades, documentos de texto).
			if (key === 'k' && isKeyframes(v) && (v as Any[]).every((kf) => typeof kf?.t === 'number')) for (const kf of v as Any[]) kf.t = sc(kf.t);
			walk(v);
		}
	};
	for (const { layers } of allLayerLists(json)) {
		for (const l of layers) {
			if (!l) continue;
			for (const key of ['ip', 'op', 'st'] as const) if (key in l) l[key] = sc(l[key]);
		}
	}
	walk(json.layers);
	for (const a of json.assets ?? []) if (a?.layers) walk(a.layers);
	for (const m of Array.isArray(json.markers) ? json.markers : []) {
		m.tm = sc(m.tm);
		m.dr = sc(m.dr);
	}
	json.ip = sc(json.ip);
	json.op = sc(json.op);
	json.fr = fps;
	return json;
}

/** Recorta o intervalo exibido (frames absolutos da composição). */
export function trim(json: LottieJSON, ip: number, op: number): LottieJSON {
	if (!Number.isFinite(ip) || !Number.isFinite(op) || op <= ip) throw new Error('Intervalo inválido: o fim precisa ser maior que o início.');
	json.ip = ip;
	json.op = op;
	return json;
}

/** Desloca a posição de uma camada sem pai (estática, animada ou com X/Y separados). */
function offsetPosition(l: Any, dx: number, dy: number) {
	l.ks ??= {};
	const p = l.ks.p;
	const add = (arr: Any) => {
		if (Array.isArray(arr) && typeof arr[0] === 'number') {
			arr[0] += dx;
			if (arr.length > 1) arr[1] += dy;
		}
	};
	const prop = (pr: Any, d: number) => {
		if (!pr) return;
		if (isKeyframes(pr.k)) {
			for (const kf of pr.k) {
				for (const key of ['s', 'e'] as const) {
					if (Array.isArray(kf?.[key])) kf[key][0] += d;
					else if (typeof kf?.[key] === 'number') kf[key] += d;
				}
			}
		} else if (typeof pr.k === 'number') pr.k += d;
		else if (Array.isArray(pr.k)) pr.k[0] += d;
	};
	if (!p) l.ks.p = { a: 0, k: [dx, dy, 0] };
	else if (p.s === true) {
		prop(p.x, dx);
		prop(p.y, dy);
	} else if (isKeyframes(p.k)) for (const kf of p.k) (add(kf?.s), add(kf?.e));
	else add(p.k);
}

/**
 * Redimensiona a composição.
 * - `canvas`: muda só a área (w/h) e centraliza o conteúdo antigo (sem escalar).
 * - `scale`: embrulha tudo numa precomp escalada para caber (contain) e centralizada.
 */
export function resize(json: LottieJSON, w: number, h: number, mode: 'canvas' | 'scale'): LottieJSON {
	if (!(w > 0 && h > 0)) throw new Error('Tamanho inválido.');
	w = Math.round(w);
	h = Math.round(h);
	const ow = json.w;
	const oh = json.h;
	if (mode === 'canvas') {
		const dx = (w - ow) / 2;
		const dy = (h - oh) / 2;
		if (dx || dy) for (const l of json.layers) if (l && l.parent === undefined) offsetPosition(l, dx, dy);
	} else {
		const s = Math.min(w / ow, h / oh) * 100;
		const ids = new Set((json.assets ?? []).map((a: Any) => a?.id));
		let id = 'resize_comp';
		for (let n = 1; ids.has(id); n++) id = `resize_comp_${n}`;
		json.assets ??= [];
		json.assets.push({ id, nm: 'Conteúdo original', fr: json.fr, layers: json.layers });
		json.layers = [
			{
				ddd: 0,
				ind: 1,
				ty: 0,
				nm: 'Conteúdo redimensionado',
				refId: id,
				sr: 1,
				ks: {
					o: { a: 0, k: 100 },
					r: { a: 0, k: 0 },
					p: { a: 0, k: [w / 2, h / 2, 0] },
					a: { a: 0, k: [ow / 2, oh / 2, 0] },
					s: { a: 0, k: [round4(s), round4(s), 100] }
				},
				ao: 0,
				w: ow,
				h: oh,
				ip: json.ip,
				op: json.op,
				st: 0,
				bm: 0
			}
		];
	}
	json.w = w;
	json.h = h;
	return json;
}

// =====================================================================
// Informações e validação
// =====================================================================

export type LottieInfo = {
	width: number;
	height: number;
	fps: number;
	frames: number;
	/** Segundos. */
	duration: number;
	version: string;
	layers: number;
	assets: number;
	images: number;
	texts: number;
	hasExpressions: boolean;
	/** `time` e `duration` em segundos (frame = time * fps). */
	markers: { name: string; time: number; duration: number }[];
	bytes: number;
};

function hasExpr(o: Any, seen = new Set<object>()): boolean {
	if (!o || typeof o !== 'object' || seen.has(o)) return false;
	seen.add(o);
	if (!Array.isArray(o) && typeof o.x === 'string' && ('k' in o || 'a' in o)) return true;
	for (const v of Array.isArray(o) ? o : Object.values(o)) if (v && typeof v === 'object' && hasExpr(v, seen)) return true;
	return false;
}

function isImageAsset(a: Any) {
	return a && !a.layers && typeof a.p === 'string' && a.t !== 3; // t:3 = dados/áudio em alguns exportadores
}

export function info(json: LottieJSON): LottieInfo {
	const lists = allLayerLists(json);
	const fps = Number(json.fr) || 0;
	const frames = Math.max(0, json.op - json.ip);
	let layers = 0;
	let texts = 0;
	for (const { layers: ls } of lists) {
		layers += ls.length;
		texts += ls.filter((l: Any) => l?.ty === 5).length;
	}
	const assets = json.assets ?? [];
	return {
		width: json.w,
		height: json.h,
		fps,
		frames,
		duration: fps ? frames / fps : 0,
		version: String(json.v ?? ''),
		layers,
		assets: assets.length,
		images: assets.filter(isImageAsset).length,
		texts,
		hasExpressions: hasExpr(json.layers) || assets.some((a: Any) => a?.layers && hasExpr(a.layers)),
		markers: (Array.isArray(json.markers) ? json.markers : []).map((m: Any) => ({
			name: String(m?.cm ?? ''),
			time: fps ? (Number(m?.tm) || 0) / fps : 0,
			duration: fps ? (Number(m?.dr) || 0) / fps : 0
		})),
		bytes: new TextEncoder().encode(JSON.stringify(json)).length
	};
}

/** Checagens de sanidade; devolve avisos legíveis (lista vazia = ok). */
export function validateLottie(json: unknown): string[] {
	const w: string[] = [];
	try {
		assertLottie(json);
	} catch (e) {
		return [(e as Error).message];
	}
	const j = json as LottieJSON;
	if (!(j.fr > 0)) w.push('FPS (fr) precisa ser maior que zero.');
	else if (j.fr > 120) w.push(`FPS muito alto (${j.fr}).`);
	if (!(j.op > j.ip)) w.push('O frame final (op) precisa ser maior que o inicial (ip).');
	if (!(j.w > 0 && j.h > 0)) w.push('Largura e altura precisam ser maiores que zero.');
	if (j.w > 8192 || j.h > 8192) w.push(`Composição muito grande (${j.w}×${j.h}).`);
	const major = parseInt(String(j.v), 10);
	if (!Number.isFinite(major)) w.push('Versão (v) ausente ou inválida.');
	else if (major < 4) w.push(`Versão antiga do bodymovin (${j.v}); pode não renderizar corretamente.`);
	if (!j.layers.length) w.push('A animação não tem camadas.');
	const assetIds = new Set((j.assets ?? []).map((a: Any) => a?.id));
	for (const { prefix, layers } of allLayerLists(j)) {
		layers.forEach((l: Any, i: number) => {
			const where = `camada ${prefix}${i}${l?.nm ? ` (${l.nm})` : ''}`;
			if (!l || typeof l !== 'object') return w.push(`A ${where} é inválida.`);
			if (typeof l.ty !== 'number') w.push(`A ${where} não tem tipo (ty).`);
			if ((l.ty === 0 || l.ty === 2) && !assetIds.has(l.refId)) w.push(`A ${where} referencia um asset inexistente (${l.refId}).`);
			if (l.ty === 5 && !Array.isArray(l.t?.d?.k)) w.push(`A ${where} é de texto mas não tem documento.`);
			if (l.ddd === 1) w.push(`A ${where} é 3D; o suporte do player é limitado.`);
		});
	}
	for (const a of j.assets ?? []) {
		if (isImageAsset(a) && !String(a.p).startsWith('data:')) w.push(`A imagem "${a.id}" é externa (${a.u ?? ''}${a.p}) e não está embutida.`);
	}
	if (listTexts(j).length && !Array.isArray(j.fonts?.list)) w.push('Há camadas de texto, mas a lista de fontes (fonts) está ausente.');
	if (Array.isArray(j.chars) && j.chars.length) w.push('A animação usa glifos (chars): editar textos só funciona com os caracteres incluídos.');
	if (hasExpr(j.layers) || (j.assets ?? []).some((a: Any) => a?.layers && hasExpr(a.layers))) w.push('Usa expressões: alguns players (mobile, canvas worker) podem ignorá-las.');
	return w;
}
