// Contrato dos textos por idioma. Cada idioma escreve frases nativas; a lógica de quais
// frases entram em cada página fica em ../formats.ts (analyze) e ../pages.ts.
import type { FaqKey, Fmt, HookKey, NoteKey, NotKey, OptKey, SizeKey } from '../formats.ts';

export type QA = { q: string; a: string };
export type Section = { h2: string; body: string[] };

export type FmtText = {
	/** nome completo ("Portable Network Graphics") */
	full: string;
	/** parágrafo "sobre o formato": quem cria, para que serve, suporte */
	about: string;
	/** por que alguém quer sair deste formato (frase completa) */
	pain: string;
	/** por que alguém quer chegar neste formato (frase completa) */
	gain: string;
};

/** A e B são os rótulos dos formatos ("PNG", "WebP"). */
type T = (A: string, B: string) => string;

export type HubCopy = {
	title: string;
	description: string;
	h1: string;
	lead: string;
	sections: Section[];
	steps: string[];
	faq: QA[];
	label: string;
};

export type Copy = {
	fmt: Record<Fmt, FmtText>;
	pairLabel: T;
	pairTitle: T;
	pairH1: T;
	pairLead: (A: string, B: string, fa: FmtText, fb: FmtText) => string;
	/** candidatas de description (140–160); a primeira que couber é usada */
	pairDesc: (A: string, B: string, hook: string) => string[];
	hook: Record<HookKey, T>;
	h2: { why: T; changes: T; size: T; not: T; about: T };
	note: Record<NoteKey, T>;
	size: Record<SizeKey, T>;
	sizeTip: T;
	not: Record<NotKey, T>;
	faq: Record<FaqKey, (A: string, B: string) => QA>;
	faqSize: T;
	faqBatch: (A: string, B: string) => QA;
	general: { free: QA; upload: QA; batch: QA; phone: QA };
	steps: { add: T; target: T; convert: T };
	opt: Record<OptKey, T>;
	hubs: Record<'converter' | 'editor' | 'remove-bg' | 'compress' | 'resize', HubCopy>;
};

// ---------------------------------------------------------------------------------------------
// App Motion (Lottie): visualizador, editor e criador de animações. Cada página tem duas seções
// próprias (o que é / como funciona) + seções compartilhadas escolhidas em ../pages.ts.

export type MotionKind =
	| 'lottie-viewer'
	| 'lottie-editor'
	| 'lottie-maker'
	| 'lottie-to-gif'
	| 'lottie-to-mp4'
	| 'lottie-to-webm'
	| 'json-to-lottie'
	| 'text-animation';

/** Seções reaproveitadas entre páginas: o que dá para mudar, exportação e usos, dicas de peso, GIF × MP4 × Lottie. */
export type MotionSectionKey = 'edit' | 'export' | 'tips' | 'choose';

/** Perguntas reaproveitadas entre páginas. */
export type MotionFaqKey = 'dotlottie' | 'expressions' | 'fonts' | 'gifAlpha' | 'webcodecs' | 'privacy' | 'phone' | 'free';

export type MotionPageCopy = {
	/** rótulo curto usado nos links relacionados */
	label: string;
	title: string;
	/** 140–160 caracteres */
	description: string;
	h1: string;
	lead: string;
	/** seções próprias da página (o que é, como funciona) */
	sections: Section[];
	steps: string[];
	/** perguntas próprias da página */
	faq: QA[];
};

export type MotionCopy = {
	pages: Record<MotionKind, MotionPageCopy>;
	sections: Record<MotionSectionKey, Section>;
	faq: Record<MotionFaqKey, QA>;
};
