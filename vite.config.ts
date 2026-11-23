import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';

// O transformers.js (IA local do editor de imagens) baixa o runtime ONNX do jsDelivr e guarda no Cache Storage.
// Os .wasm que nunca carregam saem do build: o do ONNX (~27 MB) e o AVIF multithread (sem COOP/COEP não há threads).
const dropOrtWasm = (): Plugin => ({
	name: 'drop-ort-wasm',
	generateBundle(_, bundle) {
		for (const k of Object.keys(bundle)) if (/(ort-wasm|avif_enc_mt).*\.wasm$/.test(k)) delete bundle[k];
	}
});

// SvelteKit 3: a configuração do kit mora no plugin (svelte.config.js não existe mais).
export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: { runes: true },
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				fallback: '404.html',
				strict: true
			}),
			prerender: { handleHttpError: 'warn' }
		})
	],
	// jsquash (AVIF/WebP em WASM no conversor): o pré-empacotamento do dev quebra a URL do .wasm.
	optimizeDeps: { exclude: ['@jsquash/avif', '@jsquash/webp'] },
	worker: { format: 'es', plugins: () => [dropOrtWasm()] },
	build: { target: 'es2022' }
});
