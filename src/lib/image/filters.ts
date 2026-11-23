// Metadados dos filtros do editor de imagens (sem DOM, sem código de worker).
// A UI monta os controles a partir de `params`; os rótulos ficam em `#lib/i18n/messages/imageFx.ts`.
// A implementação está em `filters-impl.ts` (roda no worker `workers/ops.worker.ts`).

export type FilterGroup = 'adjust' | 'blur' | 'sharpen' | 'noise' | 'stylize' | 'distort' | 'artistic';

export const FILTER_GROUPS: FilterGroup[] = ['adjust', 'blur', 'sharpen', 'noise', 'stylize', 'distort', 'artistic'];

export type ParamDef =
	| { key: string; type: 'range'; min: number; max: number; step: number; default: number; unit?: '%' | 'px' | '°' }
	| { key: string; type: 'select'; options: string[]; default: string }
	| { key: string; type: 'color'; default: string } // '#rrggbb'
	| { key: string; type: 'bool'; default: boolean };

export type FilterDef = {
	id: string;
	group: FilterGroup;
	params: ParamDef[];
	/** true = pesado: a UI mostra aviso */
	heavy?: boolean;
	/** parâmetros em px que escalam junto com a redução da prévia */
	scaled?: string[];
};

// Atalhos para deixar a tabela legível.
const range = (key: string, min: number, max: number, step: number, def: number, unit?: '%' | 'px' | '°'): ParamDef =>
	unit ? { key, type: 'range', min, max, step, default: def, unit } : { key, type: 'range', min, max, step, default: def };
const select = (key: string, options: string[], def: string): ParamDef => ({ key, type: 'select', options, default: def });
const color = (key: string, def: string): ParamDef => ({ key, type: 'color', default: def });
const bool = (key: string, def: boolean): ParamDef => ({ key, type: 'bool', default: def });
const center = (): ParamDef[] => [range('centerX', 0, 100, 1, 50, '%'), range('centerY', 0, 100, 1, 50, '%')];

export const FILTERS: FilterDef[] = [
	// ---------- Ajustes ----------
	{ id: 'brightness-contrast', group: 'adjust', params: [range('brightness', -100, 100, 1, 10), range('contrast', -100, 100, 1, 10)] },
	{ id: 'hue-saturation', group: 'adjust', params: [range('hue', -180, 180, 1, 0, '°'), range('saturation', -100, 100, 1, 20), range('lightness', -100, 100, 1, 0)] },
	{
		id: 'levels',
		group: 'adjust',
		params: [
			range('inBlack', 0, 254, 1, 10),
			range('inWhite', 1, 255, 1, 245),
			range('gamma', 0.1, 9.99, 0.01, 1),
			range('outBlack', 0, 255, 1, 0),
			range('outWhite', 0, 255, 1, 255)
		]
	},
	{ id: 'exposure', group: 'adjust', params: [range('exposure', -5, 5, 0.01, 0.5), range('offset', -0.5, 0.5, 0.001, 0), range('gamma', 0.1, 5, 0.01, 1)] },
	{ id: 'vibrance', group: 'adjust', params: [range('vibrance', -100, 100, 1, 40)] },
	{ id: 'temperature', group: 'adjust', params: [range('temperature', -100, 100, 1, 25), range('tint', -100, 100, 1, 0)] },
	{ id: 'auto-level', group: 'adjust', params: [] },
	{ id: 'invert', group: 'adjust', params: [] },
	{ id: 'grayscale', group: 'adjust', params: [select('mode', ['luminosity', 'average', 'desaturate'], 'luminosity')] },
	{ id: 'sepia', group: 'adjust', params: [range('amount', 0, 100, 1, 100, '%')] },
	{ id: 'posterize', group: 'adjust', params: [range('levels', 2, 64, 1, 6)] },
	{ id: 'threshold', group: 'adjust', params: [range('level', 0, 255, 1, 128)] },
	{ id: 'colorize', group: 'adjust', params: [color('color', '#d97706'), range('amount', 0, 100, 1, 100, '%')] },

	// ---------- Desfoque ----------
	{ id: 'gaussian-blur', group: 'blur', params: [range('radius', 0, 200, 0.1, 4, 'px')], scaled: ['radius'] },
	{ id: 'box-blur', group: 'blur', params: [range('radius', 0, 200, 1, 4, 'px')], scaled: ['radius'] },
	{
		id: 'motion-blur',
		group: 'blur',
		params: [range('angle', -180, 180, 1, 0, '°'), range('distance', 1, 400, 1, 24, 'px'), bool('centered', true)],
		scaled: ['distance']
	},
	{ id: 'radial-blur', group: 'blur', params: [range('angle', 0, 180, 1, 10, '°'), ...center(), select('quality', ['low', 'medium', 'high'], 'medium')], heavy: true },
	{ id: 'zoom-blur', group: 'blur', params: [range('amount', 0, 100, 1, 30), ...center()], heavy: true },
	{ id: 'surface-blur', group: 'blur', params: [range('radius', 1, 50, 1, 5, 'px'), range('threshold', 2, 255, 1, 20)], heavy: true, scaled: ['radius'] },

	// ---------- Nitidez ----------
	{ id: 'sharpen', group: 'sharpen', params: [range('amount', 0, 100, 1, 50, '%')] },
	{
		id: 'unsharp-mask',
		group: 'sharpen',
		params: [range('amount', 0, 500, 1, 100, '%'), range('radius', 0.1, 100, 0.1, 2, 'px'), range('threshold', 0, 255, 1, 0)],
		scaled: ['radius']
	},

	// ---------- Ruído ----------
	{ id: 'add-noise', group: 'noise', params: [range('amount', 0, 100, 1, 20), range('saturation', 0, 100, 1, 50, '%'), bool('mono', false)] },
	{ id: 'median', group: 'noise', params: [range('radius', 1, 20, 1, 2, 'px'), range('percentile', 0, 100, 1, 50, '%')], heavy: true, scaled: ['radius'] },
	{ id: 'reduce-noise', group: 'noise', params: [range('strength', 0, 100, 1, 40, '%')] },

	// ---------- Estilizar ----------
	{ id: 'emboss', group: 'stylize', params: [range('angle', -180, 180, 1, 135, '°'), range('strength', 1, 10, 0.1, 3)] },
	{ id: 'relief', group: 'stylize', params: [range('angle', -180, 180, 1, 135, '°'), range('strength', 1, 10, 0.1, 2)] },
	{ id: 'edge-detect', group: 'stylize', params: [select('mode', ['sobel', 'laplacian'], 'sobel'), bool('invert', false)] },
	{ id: 'pixelate', group: 'stylize', params: [range('size', 2, 200, 1, 10, 'px'), select('shape', ['square', 'hex'], 'square')], scaled: ['size'] },
	{
		id: 'vignette',
		group: 'stylize',
		params: [range('amount', 0, 100, 1, 60, '%'), range('radius', 10, 150, 1, 100, '%'), range('softness', 0, 100, 1, 50, '%'), color('color', '#000000')]
	},
	{ id: 'glow', group: 'stylize', params: [range('radius', 1, 100, 1, 6, 'px'), range('brightness', -100, 100, 1, 10), range('contrast', -100, 100, 1, 10)], scaled: ['radius'] },

	// ---------- Distorcer ----------
	{ id: 'twist', group: 'distort', params: [range('angle', -720, 720, 1, 120, '°'), range('radius', 1, 100, 1, 50, '%'), ...center()] },
	{ id: 'bulge', group: 'distort', params: [range('amount', -100, 100, 1, 50), range('radius', 1, 100, 1, 50, '%'), ...center()] },
	{ id: 'pinch', group: 'distort', params: [range('amount', 0, 100, 1, 50), range('radius', 1, 100, 1, 50, '%'), ...center()] },
	{ id: 'frosted-glass', group: 'distort', params: [range('amount', 1, 50, 1, 4, 'px')], scaled: ['amount'] },
	{
		id: 'tile-reflection',
		group: 'distort',
		params: [range('size', 4, 400, 1, 40, 'px'), range('angle', -45, 45, 1, 30, '°'), range('curvature', -100, 100, 1, 40)],
		scaled: ['size']
	},
	{ id: 'polar', group: 'distort', params: [select('direction', ['to-polar', 'from-polar'], 'to-polar')] },

	// ---------- Artístico ----------
	{ id: 'oil-paint', group: 'artistic', params: [range('radius', 1, 20, 1, 4, 'px'), range('levels', 2, 64, 1, 20)], heavy: true, scaled: ['radius'] },
	{ id: 'pencil-sketch', group: 'artistic', params: [range('radius', 1, 40, 0.5, 6, 'px'), range('contrast', -100, 100, 1, 0)], scaled: ['radius'] },
	{ id: 'halftone', group: 'artistic', params: [range('size', 3, 60, 1, 8, 'px'), range('angle', -90, 90, 1, 45, '°'), bool('colored', false)], scaled: ['size'] }
];

const byId = new Map(FILTERS.map((f) => [f.id, f]));

export const filterById = (id: string): FilterDef | undefined => byId.get(id);

export const defaultParams = (f: FilterDef): Record<string, number | string | boolean> => {
	const o: Record<string, number | string | boolean> = {};
	for (const p of f.params) o[p.key] = p.default;
	return o;
};
