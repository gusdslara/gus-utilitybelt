// Diff por linha (jsdiff) com destaque intralinha por palavra.
import { diffLines, diffWordsWithSpace } from 'diff';

export type Seg = { text: string; changed: boolean };
export type Cell = { n: number; segs: Seg[] } | null;
export type Row = { kind: 'same' | 'add' | 'del' | 'mod'; left: Cell; right: Cell };

function split(value: string) {
	const lines = value.split('\n');
	if (lines[lines.length - 1] === '') lines.pop();
	return lines;
}

function wordSegs(a: string, b: string): [Seg[], Seg[]] {
	const parts = diffWordsWithSpace(a, b);
	const l: Seg[] = [], r: Seg[] = [];
	for (const p of parts) {
		if (p.added) r.push({ text: p.value, changed: true });
		else if (p.removed) l.push({ text: p.value, changed: true });
		else {
			l.push({ text: p.value, changed: false });
			r.push({ text: p.value, changed: false });
		}
	}
	return [l, r];
}

const plain = (t: string): Seg[] => [{ text: t, changed: false }];

/** Linhas alinhadas para exibição lado a lado (e base para a unificada). */
export function computeDiff(a: string, b: string, ignoreWhitespace = false) {
	const parts = diffLines(a, b, { ignoreWhitespace });
	const rows: Row[] = [];
	let ln = 1, rn = 1, added = 0, removed = 0;
	for (let i = 0; i < parts.length; i++) {
		const p = parts[i];
		const lines = split(p.value);
		if (p.removed && parts[i + 1]?.added) {
			const next = split(parts[i + 1].value);
			const max = Math.max(lines.length, next.length);
			for (let k = 0; k < max; k++) {
				const L = lines[k], R = next[k];
				if (L !== undefined && R !== undefined) {
					const [ls, rs] = wordSegs(L, R);
					rows.push({ kind: 'mod', left: { n: ln++, segs: ls }, right: { n: rn++, segs: rs } });
				} else if (L !== undefined) rows.push({ kind: 'del', left: { n: ln++, segs: plain(L) }, right: null });
				else rows.push({ kind: 'add', left: null, right: { n: rn++, segs: plain(R!) } });
			}
			removed += lines.length;
			added += next.length;
			i++;
		} else if (p.removed) {
			for (const L of lines) rows.push({ kind: 'del', left: { n: ln++, segs: plain(L) }, right: null });
			removed += lines.length;
		} else if (p.added) {
			for (const R of lines) rows.push({ kind: 'add', left: null, right: { n: rn++, segs: plain(R) } });
			added += lines.length;
		} else {
			for (const L of lines) rows.push({ kind: 'same', left: { n: ln++, segs: plain(L) }, right: { n: rn++, segs: plain(L) } });
		}
	}
	return { rows, added, removed, equal: added === 0 && removed === 0 };
}

/** Oculta trechos iguais longos, mantendo `ctx` linhas de contexto ao redor das mudanças. */
export function collapse(rows: Row[], ctx = 3): (Row | { kind: 'gap'; count: number; from: number })[] {
	const keep = new Array(rows.length).fill(false);
	rows.forEach((r, i) => {
		if (r.kind !== 'same') for (let k = Math.max(0, i - ctx); k <= Math.min(rows.length - 1, i + ctx); k++) keep[k] = true;
	});
	const out: (Row | { kind: 'gap'; count: number; from: number })[] = [];
	let i = 0;
	while (i < rows.length) {
		if (keep[i]) out.push(rows[i++]);
		else {
			const from = i;
			while (i < rows.length && !keep[i]) i++;
			if (i - from <= 2) for (let k = from; k < i; k++) out.push(rows[k]);
			else out.push({ kind: 'gap', count: i - from, from });
		}
	}
	return out;
}
