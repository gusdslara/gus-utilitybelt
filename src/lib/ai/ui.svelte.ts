// Estado de navegação da janela (qual app/ferramenta está aberta). Compartilhado entre a página,
// a dock e a ponte de IA (app_open), e refletido na URL (?app=…&tool=…) para links diretos.
import { categories, type CategoryId, type ToolId } from '#lib/tools/registry.ts';

export type AppId = 'editor' | 'image' | 'motion' | 'clipboard' | 'api' | CategoryId;
export const APP_IDS: AppId[] = ['editor', 'image', 'motion', 'clipboard', 'api', ...categories.map((c) => c.id)];
export const TOOL_IDS: ToolId[] = categories.flatMap((c) => c.tools);

class UiState {
	current = $state<AppId>('editor');
	openTool = $state<ToolId | null>(null);
	/** App Imagem: editor completo ou conversor em lote (modo fácil). */
	imageMode = $state<'edit' | 'convert'>('edit');
	/** App Motion: criar animação ou abrir/editar Lottie. */
	motionMode = $state<'create' | 'view'>('create');
	/** Formato pré-selecionado na exportação do Motion (páginas de SEO, ex.: lottie-para-gif). */
	motionExport = $state<string | null>(null);
	/** Formato inicial do conversor (?to=webp). */
	convertTo = $state<string | null>(null);
	/** Estado inicial da página (rotas de SEO): o que for igual a isso não vai para a URL. */
	defaults: { app: AppId; imageMode: 'edit' | 'convert'; convertTo: string | null; motionMode: 'create' | 'view' } = { app: 'editor', imageMode: 'edit', convertTo: null, motionMode: 'create' };
	/** Modo automação: esconde a dock e o texto de introdução na tela API e IA (para IAs/scripts). */
	automation = $state(false);

	/** Sem menu: só vale na tela API e IA. */
	get chromeless() {
		return this.automation && this.current === 'api';
	}

	select(id: AppId, tool?: ToolId | null) {
		this.current = id;
		const c = categories.find((x) => x.id === id);
		this.openTool = c ? (tool && c.tools.includes(tool) ? tool : c.tools[0]) : null;
	}

	/** Abre uma ferramenta pelo id, descobrindo a categoria. */
	openToolById(tool: ToolId) {
		const c = categories.find((x) => x.tools.includes(tool));
		if (c) this.select(c.id, tool);
		return !!c;
	}

	toggle(id: ToolId) {
		this.openTool = this.openTool === id ? null : id;
	}

	/** Lê ?app= / ?tool= (aceita só ?tool=uuid também) e ?automation=1. */
	fromUrl(url: URL) {
		const app = url.searchParams.get('app') as AppId | null;
		const tool = url.searchParams.get('tool') as ToolId | null;
		this.automation = /^(1|true|yes|sim|on)$/i.test(url.searchParams.get('automation') ?? '');
		const mode = url.searchParams.get('mode');
		if (mode === 'convert' || mode === 'edit') this.imageMode = mode;
		if (mode === 'create' || mode === 'view') this.motionMode = mode;
		const to = url.searchParams.get('to');
		if (to && /^[a-z0-9]{2,5}$/.test(to)) this.convertTo = to;
		if (tool && TOOL_IDS.includes(tool) && (!app || app === categories.find((c) => c.tools.includes(tool))?.id)) this.openToolById(tool);
		else if (app && APP_IDS.includes(app)) this.select(app);
	}

	toSearch() {
		const p = new URLSearchParams();
		if (this.current !== this.defaults.app) p.set('app', this.current);
		if (this.current === 'image') {
			if (this.imageMode !== this.defaults.imageMode) p.set('mode', this.imageMode);
			if (this.imageMode === 'convert' && this.convertTo && this.convertTo !== this.defaults.convertTo) p.set('to', this.convertTo);
		}
		if (this.current === 'motion' && this.motionMode !== this.defaults.motionMode) p.set('mode', this.motionMode);
		if (this.openTool) p.set('tool', this.openTool);
		if (this.chromeless) p.set('automation', '1');
		const s = p.toString();
		return s ? `?${s}` : '';
	}
}

export const ui = new UiState();
