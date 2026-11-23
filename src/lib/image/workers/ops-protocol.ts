// Protocolo do worker de pixels (`ops.worker.ts`). Arquivo só de tipos: a thread principal importa daqui
// sem puxar o código do worker.
import type { WandOptions } from '../types.ts';

export type FilterParamValues = Record<string, number | string | boolean>;

/** Pedidos (principal → worker). */
export type OpsReq =
	| {
			id: number;
			op: 'filter';
			filter: string;
			params: FilterParamValues;
			image: ImageData;
			/** alfa w*h (0..255): limita o filtro à seleção, com borda suave */
			mask?: Uint8ClampedArray | null;
			/** fator de redução da prévia (multiplica parâmetros em px) */
			scale?: number;
	  }
	| { id: number; op: 'wand'; image: ImageData; x: number; y: number; opts: WandOptions };

/** Respostas (worker → principal). `result`: ImageData para 'filter', máscara w*h para 'wand'. */
export type OpsRes =
	| { id: number; type: 'progress'; value: number }
	| { id: number; type: 'done'; result: ImageData | Uint8ClampedArray }
	| { id: number; type: 'error'; message: string };

export type Req = OpsReq;
export type Res = OpsRes;
