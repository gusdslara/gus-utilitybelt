// Cliente do worker de scan/PDF (RPC por id). Um worker para trabalhos e outro só para a detecção ao vivo
// da câmera, para o preview nunca esperar uma página pesada. Criados sob demanda (seguro para SSR).
import type { DetectResult, PageParams, PdfPageResult, ProbeResult, RenderResult, Req } from './protocol.ts';
import type { PdfSettings } from '../pdf/layout.ts';

type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;

class Rpc {
	private w: Worker | null = null;
	private seq = 0;
	private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

	private worker() {
		if (this.w) return this.w;
		const w = new Worker(new URL('./scan.worker.ts', import.meta.url), { type: 'module' });
		w.onmessage = (e) => {
			const res = e.data;
			const p = this.pending.get(res.id);
			if (!p) return;
			this.pending.delete(res.id);
			if (res.ok) p.resolve(res.result);
			else p.reject(new Error(res.error));
		};
		w.onerror = (e) => {
			for (const p of this.pending.values()) p.reject(new Error(e.message || 'Falha no worker.'));
			this.pending.clear();
			w.terminate();
			this.w = null;
		};
		return (this.w = w);
	}

	call<T>(req: DistributiveOmit<Req, 'id'>, transfer: Transferable[] = []): Promise<T> {
		const id = ++this.seq;
		return new Promise<T>((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			this.worker().postMessage({ ...req, id }, transfer);
		});
	}

	get busy() {
		return this.pending.size;
	}

	terminate() {
		this.w?.terminate();
		this.w = null;
		for (const p of this.pending.values()) p.reject(new Error('aborted'));
		this.pending.clear();
	}
}

const jobs = new Rpc();
const live = new Rpc();

export const scan = {
	probe: (key: string, src: Blob, detect: boolean) => jobs.call<ProbeResult>({ op: 'probe', key, src, detect }),
	render: (key: string, src: Blob, params: PageParams, maxSide: number, quality = 0.85) =>
		jobs.call<RenderResult>({ op: 'render', key, src, params: $snapshot(params), maxSide, quality }),
	pdfPage: (key: string, src: Blob, params: PageParams, settings: PdfSettings) =>
		jobs.call<PdfPageResult>({ op: 'pdf-page', key, src, params: $snapshot(params), settings: { ...settings } }),
	image: (key: string, src: Blob, params: PageParams, type: 'image/jpeg' | 'image/png', quality = 0.92) =>
		jobs.call<RenderResult>({ op: 'image', key, src, params: $snapshot(params), type, quality }),
	forget: (key: string) => jobs.call<boolean>({ op: 'forget', key }).catch(() => false),
	/** Detecção num quadro da câmera (o bitmap é transferido). */
	detectFrame: (bitmap: ImageBitmap) => live.call<DetectResult>({ op: 'detect-frame', bitmap }, [bitmap]),
	get liveBusy() {
		return live.busy > 0;
	},
	stopLive: () => live.terminate()
};

/** Cópia simples (sem proxies do Svelte) para o structured clone. */
function $snapshot(p: PageParams): PageParams {
	return { quad: p.quad ? (p.quad.map((q) => ({ x: q.x, y: q.y })) as PageParams['quad']) : null, rotation: p.rotation, filter: p.filter, threshold: p.threshold };
}
