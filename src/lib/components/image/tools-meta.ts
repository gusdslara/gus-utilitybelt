// Ícones e atalhos das ferramentas (ordem da paleta, agrupada como no Paint.NET).
import { Move, SquareDashed, CircleDashed, Lasso, WandSparkles, Crop, Brush, Eraser, PaintBucket, Blend, Pipette, Type, Shapes, Stamp, Hand, ZoomIn } from '@lucide/svelte';
import type { ToolId } from '#lib/image/types.ts';

export const TOOLS: { id: ToolId; icon: typeof Move; key: string; group: number }[] = [
	{ id: 'move', icon: Move, key: 'V', group: 0 },
	{ id: 'select-rect', icon: SquareDashed, key: 'M', group: 0 },
	{ id: 'select-ellipse', icon: CircleDashed, key: 'M', group: 0 },
	{ id: 'select-lasso', icon: Lasso, key: 'L', group: 0 },
	{ id: 'wand', icon: WandSparkles, key: 'W', group: 0 },
	{ id: 'crop', icon: Crop, key: 'C', group: 0 },
	{ id: 'brush', icon: Brush, key: 'B', group: 1 },
	{ id: 'eraser', icon: Eraser, key: 'E', group: 1 },
	{ id: 'fill', icon: PaintBucket, key: 'G', group: 1 },
	{ id: 'gradient', icon: Blend, key: 'G', group: 1 },
	{ id: 'clone', icon: Stamp, key: 'S', group: 1 },
	{ id: 'picker', icon: Pipette, key: 'I', group: 1 },
	{ id: 'text', icon: Type, key: 'T', group: 2 },
	{ id: 'shape', icon: Shapes, key: 'U', group: 2 },
	{ id: 'hand', icon: Hand, key: 'H', group: 3 },
	{ id: 'zoom', icon: ZoomIn, key: 'Z', group: 3 }
];

export const FONTS = [
	'Inter, system-ui, sans-serif', 'system-ui, sans-serif', 'Arial, Helvetica, sans-serif', 'Verdana, sans-serif',
	'"Trebuchet MS", sans-serif', '"Segoe UI", Roboto, sans-serif', 'Impact, "Arial Black", sans-serif', 'Georgia, serif',
	'"Times New Roman", Times, serif', 'Garamond, serif', '"Courier New", monospace', '"JetBrains Mono", monospace',
	'"Comic Sans MS", cursive', 'cursive', 'fantasy'
];

export const fontLabel = (f: string) => f.split(',')[0].replaceAll('"', '');
