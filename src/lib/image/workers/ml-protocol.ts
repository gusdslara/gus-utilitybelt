// Protocolo de mensagens entre a thread principal (ml.ts) e o worker de IA local (ml.worker.ts).

export type MlDevice = 'auto' | 'webgpu' | 'wasm';
export type MlRunDevice = 'webgpu' | 'wasm';
export type MlPoint = { x: number; y: number; label: 0 | 1 };

export type MlReq =
	| { id: number; op: 'sam'; image: ImageData; imageKey: string; points: MlPoint[]; device: MlDevice }
	| { id: number; op: 'matte'; model: 'modnet' | 'rmbg'; image: ImageData; device: MlDevice }
	| { id: number; op: 'warmup'; model: 'sam' | 'modnet' | 'rmbg'; device: MlDevice };

export type MlRes =
	| { id: number; type: 'progress'; stage: 'download' | 'load' | 'run'; value: number; file?: string; loaded?: number; total?: number }
	/** `result`: alfa w*h (0..255) no tamanho da `image` enviada (vazio no warmup). */
	| { id: number; type: 'done'; result: Uint8ClampedArray; device: MlRunDevice; ms: number }
	| { id: number; type: 'error'; message: string };
