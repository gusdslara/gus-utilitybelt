// Modelo do criador de animações (app Motion). É o formato editável da cena; `toLottie(scene)` gera o JSON Lottie.
// Tempo sempre em frames. Coordenadas em px da composição (origem no canto superior esquerdo).

export type Vec2 = [number, number];
export type ColorHex = string; // '#rrggbb'

/** Curva do trecho que SAI deste keyframe até o próximo. `bezier` = cubic-bezier CSS (x1, y1, x2, y2). */
export type Easing =
	| 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'
	| 'backIn' | 'backOut' | 'elastic' | 'bounce' | 'hold'
	| { bezier: [number, number, number, number] };

export type Key<T> = { t: number; v: T; ease: Easing };
/** Propriedade animável: sem keys = valor fixo `value`; com keys, `value` é ignorado no render. */
export type Prop<T> = { value: T; keys: Key<T>[] };

export type Transform = {
	position: Prop<Vec2>; // centro da camada
	scale: Prop<Vec2>; // %, [100, 100] = normal
	rotation: Prop<number>; // graus
	opacity: Prop<number>; // 0..100
};

export type LayerBase = {
	id: string;
	name: string;
	visible: boolean;
	locked: boolean;
	start: number; // frame de entrada (ip)
	end: number; // frame de saída (op)
	transform: Transform;
};

/** Caminho bezier no espaço local da camada (centro = 0,0), no formato do Lottie: vértices + tangentes relativas. */
export type BezierPath = { v: Vec2[]; i: Vec2[]; o: Vec2[]; c: boolean };

export type ShapeKind = 'rect' | 'ellipse' | 'star' | 'polygon' | 'path';

export type ShapeLayer = LayerBase & {
	kind: 'shape';
	shape: ShapeKind;
	size: Prop<Vec2>; // rect/ellipse/star/polygon (diâmetro externo)
	radius: Prop<number>; // cantos do rect
	points: number; // star/polygon
	innerRatio: number; // star: raio interno / externo
	paths: BezierPath[]; // shape 'path' (SVG importado)
	fill: { on: boolean; color: Prop<ColorHex>; opacity: Prop<number> };
	stroke: { on: boolean; color: Prop<ColorHex>; width: Prop<number>; opacity: Prop<number>; cap: 'butt' | 'round' | 'square'; join: 'miter' | 'round' | 'bevel'; dash: number[] };
	/** "Desenhar o traço": porcentagens 0..100 (trim paths). */
	trim: { on: boolean; start: Prop<number>; end: Prop<number>; offset: Prop<number> };
};

export type TextAnimator = 'none' | 'typewriter' | 'fadeChars' | 'slideChars' | 'scaleChars';

export type TextLayer = LayerBase & {
	kind: 'text';
	text: string;
	font: string; // família CSS (fonte do sistema)
	weight: number;
	italic: boolean;
	size: number;
	color: ColorHex;
	strokeColor: ColorHex | null;
	strokeWidth: number;
	align: 'left' | 'center' | 'right';
	tracking: number; // espaçamento (unidades Lottie: milésimos de em)
	lineHeight: number; // px
	/** Animação por caractere (seletor de intervalo do Lottie), entre `animStart` e `animEnd` (frames). */
	animator: TextAnimator;
	animStart: number;
	animEnd: number;
};

export type ImageLayer = LayerBase & {
	kind: 'image';
	src: string; // data URL (embutido no Lottie)
	width: number;
	height: number;
};

export type MotionLayer = ShapeLayer | TextLayer | ImageLayer;

export type Scene = {
	version: 1;
	name: string;
	width: number;
	height: number;
	fps: number;
	frames: number; // duração total (op)
	background: ColorHex | null; // null = transparente
	/** Ordem visual: o primeiro da lista fica POR CIMA (igual ao Lottie e aos editores). */
	layers: MotionLayer[];
};

export type PresetGroup = 'entrance' | 'emphasis' | 'exit' | 'loop';
export type PresetId =
	| 'fadeIn' | 'slideInLeft' | 'slideInRight' | 'slideInUp' | 'slideInDown' | 'popIn' | 'zoomIn' | 'spinIn' | 'dropBounce' | 'drawStroke' | 'typewriter' | 'blurReveal'
	| 'pulse' | 'shake' | 'wiggle' | 'bounce' | 'heartbeat' | 'spin' | 'flash' | 'tada'
	| 'fadeOut' | 'slideOutLeft' | 'slideOutRight' | 'slideOutUp' | 'slideOutDown' | 'popOut' | 'zoomOut'
	| 'rotateLoop' | 'floatLoop' | 'pulseLoop' | 'swingLoop';

/** JSON Lottie (formato bodymovin 5.x). Tipado frouxo de propósito: o editor de Lottie mexe em arquivos de terceiros. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LottieJSON = Record<string, any> & { v: string; fr: number; ip: number; op: number; w: number; h: number; layers: any[]; assets?: any[] };
