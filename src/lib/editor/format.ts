// Formatação (beautify). Prettier e plugins são carregados sob demanda para não pesar o bundle inicial.
import type { Language } from './languages';

export type FormatResult = { ok: true; text: string; basic: boolean } | { ok: false; error: string };

const prettierPlugins: Record<string, () => Promise<unknown[]>> = {
	babel: () => Promise.all([import('prettier/plugins/babel'), import('prettier/plugins/estree')]),
	json: () => Promise.all([import('prettier/plugins/babel'), import('prettier/plugins/estree')]),
	jsonc: () => Promise.all([import('prettier/plugins/babel'), import('prettier/plugins/estree')]),
	json5: () => Promise.all([import('prettier/plugins/babel'), import('prettier/plugins/estree')]),
	typescript: () => Promise.all([import('prettier/plugins/typescript'), import('prettier/plugins/estree')]),
	css: () => Promise.all([import('prettier/plugins/postcss')]),
	scss: () => Promise.all([import('prettier/plugins/postcss')]),
	less: () => Promise.all([import('prettier/plugins/postcss')]),
	html: () => Promise.all([import('prettier/plugins/html'), import('prettier/plugins/postcss'), import('prettier/plugins/babel'), import('prettier/plugins/estree')]),
	vue: () => Promise.all([import('prettier/plugins/html'), import('prettier/plugins/postcss'), import('prettier/plugins/babel'), import('prettier/plugins/typescript'), import('prettier/plugins/estree')]),
	angular: () => Promise.all([import('prettier/plugins/html'), import('prettier/plugins/angular'), import('prettier/plugins/postcss'), import('prettier/plugins/babel'), import('prettier/plugins/estree')]),
	markdown: () => Promise.all([import('prettier/plugins/markdown'), import('prettier/plugins/babel'), import('prettier/plugins/estree'), import('prettier/plugins/yaml')]),
	mdx: () => Promise.all([import('prettier/plugins/markdown'), import('prettier/plugins/babel'), import('prettier/plugins/estree'), import('prettier/plugins/yaml')]),
	yaml: () => Promise.all([import('prettier/plugins/yaml')]),
	graphql: () => Promise.all([import('prettier/plugins/graphql')]),
	glimmer: () => Promise.all([import('prettier/plugins/glimmer')]),
	xml: () => Promise.all([import('@prettier/plugin-xml')]),
	php: () => Promise.all([import('@prettier/plugin-php/standalone')])
};

export type FormatOptions = { tabWidth?: number; useTabs?: boolean; printWidth?: number };

export async function formatCode(src: string, lang: Language, opts: FormatOptions = {}): Promise<FormatResult> {
	const tabWidth = opts.tabWidth ?? 2;
	try {
		if (lang.fmt.engine === 'prettier' && lang.fmt.parser === 'json') {
			// JSON válido: expande tudo (o Prettier mantém objetos curtos numa linha só).
			try {
				const indent = opts.useTabs ? '\t' : tabWidth;
				return { ok: true, text: JSON.stringify(JSON.parse(src), null, indent) + '\n', basic: false };
			} catch {
				/* JSON com erro: o Prettier dá uma mensagem melhor (linha/coluna) */
			}
		}
		if (lang.fmt.engine === 'prettier') {
			const parser = lang.fmt.parser;
			const [prettier, plugins] = await Promise.all([import('prettier/standalone'), prettierPlugins[parser]()]);
			const text = await prettier.format(src, {
				parser,
				plugins: plugins.map((m) => (m as { default?: unknown }).default ?? m) as never,
				tabWidth,
				useTabs: opts.useTabs ?? false,
				printWidth: opts.printWidth ?? 100,
				singleQuote: parser === 'babel' || parser === 'typescript' ? true : undefined,
				// plugin-xml: quebra de espaço sensível vira "ignore" para identar de verdade
				...(parser === 'xml' ? { xmlWhitespaceSensitivity: 'ignore', xmlSelfClosingSpace: true } : {}),
				// plugin-php tenta ler composer.json via process.cwd() se a versão não for informada
				...(parser === 'php' ? { phpVersion: '8.4' } : {})
			} as never);
			return { ok: true, text, basic: false };
		}
		if (lang.fmt.engine === 'sql') {
			const { format } = await import('sql-formatter');
			const text = format(src, { language: lang.fmt.dialect as never, tabWidth, keywordCase: 'upper', linesBetweenQueries: 1 });
			return { ok: true, text: text.endsWith('\n') ? text : text + '\n', basic: false };
		}
		return { ok: true, text: basicFormat(src, lang), basic: true };
	} catch (e) {
		return { ok: false, error: cleanError((e as Error).message ?? String(e)) };
	}
}

/** Limpeza básica para linguagens sem formatador no navegador. */
export function basicFormat(src: string, lang: Language): string {
	const keepTabs = lang.id === 'makefile' || lang.id === 'tsv' || lang.id === 'go';
	let lines = src.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''));
	if (!keepTabs && lang.id === 'python') lines = lines.map((l) => l.replace(/^\t+/, (t) => '    '.repeat(t.length)));
	let out = lines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '');
	if (lang.id === 'csv' || lang.id === 'tsv') out = out.replace(/\n{2,}/g, '\n');
	return out.replace(/\n*$/, '\n');
}

function cleanError(msg: string) {
	// Mensagens do Prettier trazem um trecho com o código; a primeira linha já diz onde está o erro.
	return msg.split('\n')[0].replace(/\u001b\[[0-9;]*m/g, '').slice(0, 240);
}
