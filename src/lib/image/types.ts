// Tipos compartilhados do editor de imagens (app "Imagem").
// Contrato entre o documento (doc.svelte.ts), o render (render.ts), os workers e o I/O (io.ts).

export type BlendMode =
	| 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'
	| 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference'
	| 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';

export const BLEND_MODES: BlendMode[] = [
	'source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn',
	'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
];

/** Preenchimento: cor sólida (CSS, com alfa) ou gradiente. `angle` em graus (linear). */
export type Paint =
	| { kind: 'none' }
	| { kind: 'solid'; color: string }
	| { kind: 'linear' | 'radial'; stops: { offset: number; color: string }[]; angle: number };

/** Efeitos de camada (estilo "layer styles"). Valem para qualquer camada, raster ou vetor. */
export type Effects = {
	shadow: { on: boolean; color: string; blur: number; x: number; y: number; opacity: number };
	glow: { on: boolean; color: string; blur: number; strength: number };
	outline: { on: boolean; color: string; width: number };
	/** Extrusão 3D: `depth` cópias deslocadas em `angle` graus, escurecidas progressivamente. */
	extrude: { on: boolean; depth: number; angle: number; color: string; shade: number };
};

export const defaultEffects = (): Effects => ({
	shadow: { on: false, color: '#000000', blur: 12, x: 6, y: 8, opacity: 0.6 },
	glow: { on: false, color: '#ffd84d', blur: 18, strength: 2 },
	outline: { on: false, color: '#000000', width: 4 },
	extrude: { on: false, depth: 12, angle: 45, color: '#7a1238', shade: 0.5 }
});

export const hasEffects = (e: Effects) => e.shadow.on || e.glow.on || e.outline.on || e.extrude.on;

export type ShapeKind = 'rect' | 'roundrect' | 'ellipse' | 'line' | 'arrow' | 'triangle' | 'polygon' | 'star' | 'heart' | 'speech';
export const SHAPES: ShapeKind[] = ['rect', 'roundrect', 'ellipse', 'line', 'arrow', 'triangle', 'polygon', 'star', 'heart', 'speech'];

/** Caixa em coordenadas do documento; `rotation` em graus em torno do centro. */
export type Box = { x: number; y: number; w: number; h: number; rotation: number };

export type ShapeData = Box & {
	type: 'shape';
	shape: ShapeKind;
	fill: Paint;
	stroke: string; // '' = sem contorno
	strokeWidth: number;
	radius: number; // roundrect / speech
	sides: number; // polygon / star (pontas)
	inner: number; // star: raio interno 0..1
	dash: boolean;
};

export type TextData = Box & {
	type: 'text';
	text: string;
	font: string; // família CSS
	size: number; // px
	weight: number;
	italic: boolean;
	align: 'left' | 'center' | 'right';
	lineHeight: number; // multiplicador
	letterSpacing: number; // px
	fill: Paint;
	stroke: string;
	strokeWidth: number;
};

export type VectorData = ShapeData | TextData;

/** Dados de camada sem o estado reativo (usado por I/O e histórico). */
export type LayerInit = {
	name: string;
	canvas: HTMLCanvasElement;
	visible?: boolean;
	opacity?: number; // 0..1
	blend?: BlendMode;
	locked?: boolean;
	vector?: VectorData | null;
	effects?: Effects;
};

/** Resultado de abrir um arquivo. Todas as camadas têm o tamanho do documento. */
export type OpenedDoc = { width: number; height: number; layers: LayerInit[]; name: string };

export type ToolId =
	| 'move' | 'select-rect' | 'select-ellipse' | 'select-lasso' | 'wand'
	| 'crop' | 'brush' | 'eraser' | 'fill' | 'gradient' | 'picker'
	| 'text' | 'shape' | 'clone' | 'hand' | 'zoom';

export type SelectMode = 'replace' | 'add' | 'subtract' | 'intersect';

export type Rect = { x: number; y: number; w: number; h: number };

// ---------- Varinha mágica ----------

/** Métrica de distância de cor. lab = ΔE perceptual (CIE76); hue = só matiz; luma = só brilho; max = maior diferença por canal. */
export type WandMetric = 'rgb' | 'rgba' | 'lab' | 'hue' | 'luma' | 'max';
/**
 * flood = contígua (4 vizinhos), flood8 = contígua (8 vizinhos, atravessa diagonais), global = cor parecida na imagem toda,
 * edge = contígua que para em bordas fortes (gradiente Sobel), cluster = k-means (aprendizado de máquina clássico, local):
 * seleciona os pixels do mesmo grupo de cor do ponto clicado.
 */
export type WandAlgo = 'flood' | 'flood8' | 'global' | 'edge' | 'cluster';
export type WandOptions = {
	algo: WandAlgo;
	metric: WandMetric;
	tolerance: number; // 0..100
	antialias: boolean; // borda suave de 1px
	clusters: number; // k (2..16) para 'cluster'
	edge: number; // 0..100: sensibilidade a bordas para 'edge'
	contiguous: boolean; // para 'cluster': só a região conectada ao clique
};
export const defaultWand = (): WandOptions => ({ algo: 'flood', metric: 'rgb', tolerance: 32, antialias: true, clusters: 6, edge: 50, contiguous: false });
