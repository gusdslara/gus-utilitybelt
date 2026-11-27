// Protocolo do worker de scan/PDF.
import type { Quad, Rotation } from './geometry.ts';
import type { ScanFilter } from './enhance.ts';
import type { PdfSettings } from '../pdf/layout.ts';
import type { PdfPageSpec } from '../pdf/writer.ts';

export type PageParams = { quad: Quad | null; rotation: Rotation; filter: ScanFilter; threshold: number };

export const defaultParams = (): PageParams => ({ quad: null, rotation: 0, filter: 'original', threshold: 50 });

export type Req =
	| { id: number; op: 'detect-frame'; bitmap: ImageBitmap }
	| { id: number; op: 'probe'; key: string; src: Blob; detect: boolean }
	| { id: number; op: 'render'; key: string; src: Blob; params: PageParams; maxSide: number; quality: number }
	| { id: number; op: 'pdf-page'; key: string; src: Blob; params: PageParams; settings: PdfSettings }
	| { id: number; op: 'image'; key: string; src: Blob; params: PageParams; type: 'image/jpeg' | 'image/png'; quality: number }
	| { id: number; op: 'forget'; key: string };

export type Res =
	| { id: number; ok: true; result: unknown }
	| { id: number; ok: false; error: string };

export type ProbeResult = { width: number; height: number; quad: Quad | null; score: number; jpeg: boolean };
export type RenderResult = { blob: Blob; width: number; height: number };
export type DetectResult = { quad: Quad | null; score: number };
export type PdfPageResult = { spec: PdfPageSpec; passthrough: boolean };
