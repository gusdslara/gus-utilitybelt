// Registro único de apps/ferramentas. A dock e os acordeões leem daqui.
// Nomes e descrições ficam no i18n: app.categories.<id> e app.tools.<id>.{title,description}.
import { t } from '#lib/i18n/index.svelte.ts';

export type ToolId =
	| 'senhas' | 'hmac'
	| 'uuid' | 'cron' | 'regex'
	| 'lorem' | 'qr' | 'barcode'
	| 'whatsapp' | 'wa-hmac' | 'wamid'
	| 'cpf-cnpj';

export type CategoryId = 'editor' | 'seguranca' | 'dev' | 'conteudo' | 'whatsapp' | 'documentos';
export type Category = { id: Exclude<CategoryId, 'editor'>; tools: ToolId[] };

export const categories: Category[] = [
	{ id: 'seguranca', tools: ['senhas', 'hmac'] },
	{ id: 'dev', tools: ['uuid', 'cron', 'regex'] },
	{ id: 'conteudo', tools: ['lorem', 'qr', 'barcode'] },
	{ id: 'whatsapp', tools: ['whatsapp', 'wa-hmac', 'wamid'] },
	{ id: 'documentos', tools: ['cpf-cnpj'] }
];

export const categoryLabel = (id: Category['id']) => t(`app.categories.${id}`);
export const toolTitle = (id: ToolId) => t(`app.tools.${id}.title`);
export const toolDescription = (id: ToolId) => t(`app.tools.${id}.description`);
