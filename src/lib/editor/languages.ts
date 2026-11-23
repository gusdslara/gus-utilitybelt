// Registro de linguagens do editor: extensões, nomes de arquivo especiais e qual formatador usar.
// `fmt` indica o motor de formatação; linguagens sem formatador recebem só a limpeza básica.

export type Formatter =
	| { engine: 'prettier'; parser: string }
	| { engine: 'sql'; dialect: string }
	| { engine: 'basic' };

export type Language = {
	id: string;
	name: string;
	/** Extensões sem ponto; a primeira é a usada ao salvar. */
	ext: string[];
	/** Nomes de arquivo exatos (minúsculos) que identificam a linguagem. */
	files?: string[];
	aliases?: string[];
	fmt: Formatter;
};

const P = (parser: string): Formatter => ({ engine: 'prettier', parser });
const SQL = (dialect = 'sql'): Formatter => ({ engine: 'sql', dialect });
const B: Formatter = { engine: 'basic' };

export const LANGUAGES: Language[] = [
	{ id: 'plaintext', name: 'Texto puro', ext: ['txt', 'text', 'log'], aliases: ['texto', 'plain'], fmt: B },
	{ id: 'json', name: 'JSON', ext: ['json', 'map', 'webmanifest', 'har'], files: ['.prettierrc', '.babelrc', '.eslintrc', 'composer.lock', '.swcrc'], fmt: P('json') },
	{ id: 'jsonc', name: 'JSON com comentários', ext: ['jsonc', 'code-workspace'], files: ['tsconfig.json', 'jsconfig.json', '.vscode/settings.json', 'devcontainer.json'], fmt: P('jsonc') },
	{ id: 'json5', name: 'JSON5', ext: ['json5'], fmt: P('json5') },
	{ id: 'yaml', name: 'YAML', ext: ['yaml', 'yml'], files: ['.clang-format', '.yamllint', 'pnpm-lock.yaml'], aliases: ['yml', 'docker-compose', 'k8s', 'kubernetes', 'github actions'], fmt: P('yaml') },
	{ id: 'javascript', name: 'JavaScript', ext: ['js', 'mjs', 'cjs'], aliases: ['node', 'ecmascript'], fmt: P('babel') },
	{ id: 'jsx', name: 'JavaScript React (JSX)', ext: ['jsx'], aliases: ['react'], fmt: P('babel') },
	{ id: 'typescript', name: 'TypeScript', ext: ['ts', 'mts', 'cts'], fmt: P('typescript') },
	{ id: 'tsx', name: 'TypeScript React (TSX)', ext: ['tsx'], aliases: ['react'], fmt: P('typescript') },
	{ id: 'html', name: 'HTML', ext: ['html', 'htm', 'xhtml'], fmt: P('html') },
	{ id: 'vue', name: 'Vue', ext: ['vue'], fmt: P('vue') },
	{ id: 'svelte', name: 'Svelte', ext: ['svelte'], fmt: B },
	{ id: 'angular', name: 'Angular (template)', ext: ['component.html'], fmt: P('angular') },
	{ id: 'css', name: 'CSS', ext: ['css', 'pcss', 'postcss'], fmt: P('css') },
	{ id: 'scss', name: 'SCSS', ext: ['scss'], aliases: ['sass'], fmt: P('scss') },
	{ id: 'less', name: 'Less', ext: ['less'], fmt: P('less') },
	{ id: 'markdown', name: 'Markdown', ext: ['md', 'markdown', 'mdown', 'mkd'], files: ['readme', 'changelog'], fmt: P('markdown') },
	{ id: 'mdx', name: 'MDX', ext: ['mdx'], fmt: P('mdx') },
	{ id: 'graphql', name: 'GraphQL', ext: ['graphql', 'gql', 'graphqls'], fmt: P('graphql') },
	{ id: 'handlebars', name: 'Handlebars', ext: ['hbs', 'handlebars'], aliases: ['glimmer', 'ember'], fmt: P('glimmer') },
	{ id: 'xml', name: 'XML', ext: ['xml', 'xsd', 'xsl', 'xslt', 'wsdl', 'plist', 'csproj', 'fsproj', 'vbproj', 'props', 'targets', 'resx', 'xaml', 'kml', 'gpx', 'rss', 'atom', 'config'], files: ['pom.xml', 'web.config'], fmt: P('xml') },
	{ id: 'svg', name: 'SVG', ext: ['svg'], fmt: P('xml') },
	{ id: 'php', name: 'PHP', ext: ['php', 'phtml', 'php8'], fmt: P('php') },
	{ id: 'sql', name: 'SQL', ext: ['sql', 'ddl', 'dml'], aliases: ['banco', 'query'], fmt: SQL() },
	{ id: 'postgresql', name: 'SQL (PostgreSQL)', ext: ['pgsql', 'psql'], aliases: ['postgres'], fmt: SQL('postgresql') },
	{ id: 'mysql', name: 'SQL (MySQL)', ext: ['mysql'], aliases: ['mariadb'], fmt: SQL('mysql') },
	{ id: 'sqlite', name: 'SQL (SQLite)', ext: ['sqlite'], fmt: SQL('sqlite') },
	{ id: 'tsql', name: 'SQL (T-SQL / SQL Server)', ext: ['tsql'], aliases: ['sqlserver', 'mssql'], fmt: SQL('transactsql') },
	{ id: 'plsql', name: 'SQL (PL/SQL / Oracle)', ext: ['pls', 'plsql', 'pkb', 'pks'], aliases: ['oracle'], fmt: SQL('plsql') },
	{ id: 'shell', name: 'Shell (Bash/Zsh)', ext: ['sh', 'bash', 'zsh', 'ksh'], files: ['.bashrc', '.zshrc', '.profile', '.bash_profile'], aliases: ['bash', 'terminal'], fmt: B },
	{ id: 'fish', name: 'Fish', ext: ['fish'], fmt: B },
	{ id: 'powershell', name: 'PowerShell', ext: ['ps1', 'psm1', 'psd1'], fmt: B },
	{ id: 'bat', name: 'Batch', ext: ['bat', 'cmd'], fmt: B },
	{ id: 'python', name: 'Python', ext: ['py', 'pyw', 'pyi'], files: ['sconstruct'], fmt: B },
	{ id: 'ruby', name: 'Ruby', ext: ['rb', 'rake', 'gemspec'], files: ['gemfile', 'rakefile'], fmt: B },
	{ id: 'go', name: 'Go', ext: ['go'], files: ['go.mod', 'go.sum'], aliases: ['golang'], fmt: B },
	{ id: 'rust', name: 'Rust', ext: ['rs'], fmt: B },
	{ id: 'java', name: 'Java', ext: ['java'], fmt: B },
	{ id: 'kotlin', name: 'Kotlin', ext: ['kt', 'kts'], fmt: B },
	{ id: 'scala', name: 'Scala', ext: ['scala', 'sc'], fmt: B },
	{ id: 'groovy', name: 'Groovy / Gradle', ext: ['groovy', 'gradle'], fmt: B },
	{ id: 'csharp', name: 'C#', ext: ['cs', 'csx'], aliases: ['dotnet'], fmt: B },
	{ id: 'fsharp', name: 'F#', ext: ['fs', 'fsx', 'fsi'], fmt: B },
	{ id: 'vb', name: 'Visual Basic', ext: ['vb', 'vbs'], fmt: B },
	{ id: 'c', name: 'C', ext: ['c', 'h'], fmt: B },
	{ id: 'cpp', name: 'C++', ext: ['cpp', 'cc', 'cxx', 'hpp', 'hh', 'hxx', 'ino'], fmt: B },
	{ id: 'objc', name: 'Objective-C', ext: ['m', 'mm'], fmt: B },
	{ id: 'swift', name: 'Swift', ext: ['swift'], fmt: B },
	{ id: 'dart', name: 'Dart', ext: ['dart'], aliases: ['flutter'], fmt: B },
	{ id: 'lua', name: 'Lua', ext: ['lua'], fmt: B },
	{ id: 'perl', name: 'Perl', ext: ['pl', 'pm'], fmt: B },
	{ id: 'r', name: 'R', ext: ['r', 'rmd'], fmt: B },
	{ id: 'julia', name: 'Julia', ext: ['jl'], fmt: B },
	{ id: 'elixir', name: 'Elixir', ext: ['ex', 'exs'], fmt: B },
	{ id: 'erlang', name: 'Erlang', ext: ['erl', 'hrl'], fmt: B },
	{ id: 'haskell', name: 'Haskell', ext: ['hs', 'lhs'], fmt: B },
	{ id: 'clojure', name: 'Clojure', ext: ['clj', 'cljs', 'cljc', 'edn'], fmt: B },
	{ id: 'zig', name: 'Zig', ext: ['zig'], fmt: B },
	{ id: 'nim', name: 'Nim', ext: ['nim'], fmt: B },
	{ id: 'gdscript', name: 'GDScript', ext: ['gd'], aliases: ['godot'], fmt: B },
	{ id: 'solidity', name: 'Solidity', ext: ['sol'], fmt: B },
	{ id: 'dockerfile', name: 'Dockerfile', ext: ['dockerfile', 'containerfile'], files: ['dockerfile', 'containerfile'], aliases: ['docker'], fmt: B },
	{ id: 'makefile', name: 'Makefile', ext: ['mk', 'mak'], files: ['makefile', 'gnumakefile'], fmt: B },
	{ id: 'cmake', name: 'CMake', ext: ['cmake'], files: ['cmakelists.txt'], fmt: B },
	{ id: 'toml', name: 'TOML', ext: ['toml'], files: ['cargo.lock', 'pipfile', 'poetry.lock'], fmt: B },
	{ id: 'ini', name: 'INI / Config', ext: ['ini', 'cfg', 'conf', 'properties', 'desktop', 'service', 'editorconfig'], files: ['.editorconfig', '.gitconfig', '.npmrc'], fmt: B },
	{ id: 'dotenv', name: '.env', ext: ['env'], files: ['.env', '.env.local', '.env.example', '.env.development', '.env.production'], aliases: ['dotenv', 'variaveis'], fmt: B },
	{ id: 'ignore', name: 'Ignore (.gitignore)', ext: ['gitignore', 'dockerignore', 'npmignore', 'prettierignore', 'eslintignore'], files: ['.gitignore', '.dockerignore', '.npmignore', '.prettierignore', '.eslintignore', '.gitattributes'], fmt: B },
	{ id: 'csv', name: 'CSV', ext: ['csv'], fmt: B },
	{ id: 'tsv', name: 'TSV', ext: ['tsv', 'tab'], fmt: B },
	{ id: 'nginx', name: 'Nginx', ext: ['nginx'], files: ['nginx.conf'], fmt: B },
	{ id: 'hcl', name: 'Terraform / HCL', ext: ['tf', 'tfvars', 'hcl'], aliases: ['terraform'], fmt: B },
	{ id: 'proto', name: 'Protocol Buffers', ext: ['proto'], aliases: ['protobuf', 'grpc'], fmt: B },
	{ id: 'prisma', name: 'Prisma', ext: ['prisma'], fmt: B },
	{ id: 'latex', name: 'LaTeX', ext: ['tex', 'sty', 'cls', 'bib'], fmt: B },
	{ id: 'diff', name: 'Diff / Patch', ext: ['diff', 'patch'], fmt: B },
	{ id: 'restructuredtext', name: 'reStructuredText', ext: ['rst'], fmt: B },
	{ id: 'asciidoc', name: 'AsciiDoc', ext: ['adoc', 'asciidoc'], fmt: B },
	{ id: 'glsl', name: 'GLSL / Shader', ext: ['glsl', 'vert', 'frag', 'wgsl', 'hlsl', 'shader'], fmt: B },
	{ id: 'assembly', name: 'Assembly', ext: ['asm', 's'], fmt: B }
];

const byId = new Map(LANGUAGES.map((l) => [l.id, l]));

export function getLanguage(id: string | null | undefined): Language {
	return (id && byId.get(id)) || byId.get('plaintext')!;
}

/** Linguagem pelo nome do arquivo (nome exato, depois extensão composta, depois extensão simples). */
export function languageFromName(name: string): Language | null {
	const lower = name.toLowerCase();
	const base = lower.split('/').pop() ?? lower;
	for (const l of LANGUAGES) if (l.files?.some((f) => f === base || lower.endsWith('/' + f))) return l;
	if (base.startsWith('.env')) return byId.get('dotenv')!;
	if (base.startsWith('dockerfile')) return byId.get('dockerfile')!;
	const parts = base.split('.');
	if (parts.length > 2) {
		const compound = parts.slice(-2).join('.');
		for (const l of LANGUAGES) if (l.ext.includes(compound)) return l;
	}
	if (parts.length < 2) return null;
	const ext = parts.pop()!;
	for (const l of LANGUAGES) if (l.ext.includes(ext)) return l;
	return null;
}

export function canPrettyFormat(l: Language) {
	return l.fmt.engine !== 'basic';
}

/** Ordem padrão do seletor quando a busca está vazia. */
const POPULAR = ['json', 'yaml', 'javascript', 'typescript', 'html', 'css', 'sql', 'markdown', 'xml', 'python', 'shell', 'plaintext', 'scss', 'tsx', 'jsx', 'graphql', 'php', 'dotenv', 'toml', 'dockerfile', 'csv'];

/** Busca rápida: nome, id, aliases e extensões. Retorna ordenado por relevância. */
export function searchLanguages(q: string, priority: string[] = []): Language[] {
	const query = q.trim().toLowerCase().replace(/^\*?\./, '');
	const prio = (l: Language) => {
		const i = priority.indexOf(l.id);
		return i === -1 ? 999 : i;
	};
	if (!query) {
		const pop = (l: Language) => {
			const i = POPULAR.indexOf(l.id);
			return i === -1 ? 999 : i;
		};
		return [...LANGUAGES].sort((a, b) => prio(a) - prio(b) || pop(a) - pop(b) || a.name.localeCompare(b.name));
	}
	const scored: { l: Language; s: number }[] = [];
	for (const l of LANGUAGES) {
		const name = l.name.toLowerCase();
		let s = 0;
		if (l.ext.includes(query)) s = 100;
		else if (l.id === query || name === query) s = 95;
		else if (name.startsWith(query) || l.id.startsWith(query)) s = 80;
		else if (l.ext.some((e) => e.startsWith(query))) s = 70;
		else if (l.aliases?.some((a) => a.startsWith(query))) s = 60;
		else if (name.includes(query)) s = 50;
		else if (l.aliases?.some((a) => a.includes(query)) || l.files?.some((f) => f.includes(query))) s = 40;
		else if (fuzzy(name, query)) s = 20;
		if (s) scored.push({ l, s: s + (prio(l) < 999 ? 5 : 0) });
	}
	return scored.sort((a, b) => b.s - a.s || a.l.name.localeCompare(b.l.name)).map((x) => x.l);
}

function fuzzy(text: string, q: string) {
	let i = 0;
	for (const c of text) if (c === q[i]) i++;
	return i === q.length;
}

// ---------------- Detecção automática pelo conteúdo ----------------

export type Detection = { id: string; confidence: number }[];

/**
 * Detecta a linguagem por heurística. Retorna candidatos ordenados (confiança 0–1).
 * Validação estrita quando possível (JSON.parse, DOMParser) para JSON e XML.
 */
export function detectLanguage(src: string): Detection {
	const text = src.trim();
	if (!text) return [];
	const head = text.slice(0, 4000);
	const lines = head.split('\n').slice(0, 120);
	const score: Record<string, number> = {};
	const add = (id: string, n: number) => (score[id] = (score[id] ?? 0) + n);
	const count = (re: RegExp) => (head.match(re) ?? []).length;

	// Estruturas com validação real
	if (/^[[{]/.test(text)) {
		try {
			JSON.parse(text);
			return [{ id: 'json', confidence: 0.99 }];
		} catch {
			if (/\/\/|\/\*/.test(text) && /"\s*:/.test(text)) add('jsonc', 6);
			if (/^\{\s*[A-Za-z_$][\w$]*\s*:/.test(text) || /,\s*[}\]]/.test(text)) add('json5', 3);
		}
	}
	if (/^<\?xml\b/i.test(text)) return [{ id: 'xml', confidence: 0.98 }];
	if (/^<\?php\b/i.test(text)) return [{ id: 'php', confidence: 0.98 }];
	if (/^<!doctype html/i.test(text) || /^<html[\s>]/i.test(text)) return [{ id: 'html', confidence: 0.98 }];
	if (/^<svg[\s>]/i.test(text)) return [{ id: 'svg', confidence: 0.97 }];
	if (/^#!.*\b(bash|sh|zsh)\b/.test(text)) return [{ id: 'shell', confidence: 0.97 }];
	if (/^#!.*\bpython/.test(text)) return [{ id: 'python', confidence: 0.97 }];
	if (/^#!.*\bnode/.test(text)) return [{ id: 'javascript', confidence: 0.95 }];
	if (/^#!.*\bfish/.test(text)) return [{ id: 'fish', confidence: 0.95 }];

	if (/^</.test(text) && />$/.test(text)) {
		if (/<template[\s>]/.test(head) && /<script[\s>]/.test(head) && /export default|defineComponent|<script setup/.test(head)) add('vue', 8);
		else if (/<\/?(div|span|p|a|body|head|section|main|nav|ul|li|table|form|input|button|img|h[1-6]|script|style|meta|link)\b/i.test(head)) add('html', 6);
		else {
			try {
				const doc = new DOMParser().parseFromString(text, 'application/xml');
				if (!doc.querySelector('parsererror')) add('xml', 8);
				else add('xml', 2);
			} catch {
				add('xml', 2);
			}
		}
	}
	if (/\{\{[#/]?\w+.*\}\}/.test(head) && /<\w+/.test(head)) add('handlebars', 2);

	// SQL
	const sqlStart = /^\s*(select|insert\s+into|update\s+\w+\s+set|delete\s+from|create\s+(or\s+replace\s+)?(table|view|index|function|procedure|database|schema|trigger)|alter\s+table|drop\s+(table|view|index)|with\s+\w+\s+as\s*\(|merge\s+into|truncate|grant|begin\s+transaction)\b/i;
	if (sqlStart.test(text)) add('sql', 7);
	add('sql', Math.min(4, count(/\b(SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|INSERT INTO|VALUES|LEFT JOIN|INNER JOIN)\b/g)));
	if (score.sql && /\bserial\b|::\w+|\bilike\b|\$\d+|returning\b/i.test(head)) add('postgresql', score.sql + 1);
	if (score.sql && /`\w+`|\bauto_increment\b|\bengine\s*=/i.test(head)) add('mysql', score.sql + 1);
	if (score.sql && /\bnvarchar\b|\btop\s+\d+|\[\w+\]\.\[|\bgo\s*$/im.test(head)) add('tsql', score.sql + 1);

	// YAML
	const yamlLines = lines.filter((l) => /^\s*(-\s+)?[\w.\-"']+\s*:(\s|$)/.test(l) || /^\s*-\s+\S/.test(l) || /^\s*#/.test(l) || !l.trim()).length;
	const ratio = yamlLines / Math.max(1, lines.length);
	if (/^---\s*$/m.test(lines[0] ?? '') || /^%YAML/.test(text)) add('yaml', 4);
	const keyLines = lines.filter((l) => /^\s*(-\s+)?[\w.\-"']+\s*:(\s|$)/.test(l)).length;
	if (ratio > 0.85 && lines.length > 1 && keyLines > 0 && !/[;{}]\s*$/m.test(head) && !/^\s*(def|class|import|function|const|let|var)\b/m.test(head)) add('yaml', 6 + (ratio === 1 ? 2 : 0));
	if (/^(apiVersion|kind|services|version|jobs|on|steps|name|stages|image|spec|metadata):/m.test(head)) add('yaml', 2);

	// Markdown
	add('markdown', Math.min(6, count(/^#{1,6}\s+\S/gm) * 2 + count(/^\s*[-*+]\s+\S/gm) * 0.5 + count(/^```/gm) + count(/\[[^\]]+\]\([^)]+\)/g) + count(/\*\*[^*]+\*\*/g) * 0.5 + count(/^>\s/gm)));

	// CSS e variantes
	const cssBlocks = count(/[^{}]+\{[^{}]*?[\w-]+\s*:\s*[^;{}]+;?[^{}]*\}/g);
	if (cssBlocks && !/\b(function|const|let|=>|return)\b/.test(head)) {
		add('css', 3 + Math.min(3, cssBlocks));
		if (/^\s*[@.#]?[\w-]+.*\{/m.test(head)) add('css', 1);
		if (/^\s*\$[\w-]+\s*:/m.test(head) || /&[:.\w-]/.test(head) || /@mixin|@include|@use\s/.test(head)) add('scss', score.css + 2);
		if (/^\s*@[\w-]+\s*:/m.test(head) || /\.[\w-]+\(\);/.test(head)) add('less', score.css + 1);
	}

	// JS / TS
	const js = count(/\b(const|let|var|function|return|=>|import\s.+\sfrom|export\s+(default|const|function|class)|require\(|console\.\w+|async|await|new\s+\w+\(|document\.|window\.)/g);
	if (js) add('javascript', Math.min(8, Math.round(js * 1.5)));
	const ts = count(/(:\s*(string|number|boolean|any|unknown|void|never|Record<|Promise<|\w+\[\]))|\binterface\s+\w+|\btype\s+\w+\s*=|\bas\s+const\b|\benum\s+\w+|\bimplements\b|\b(private|public|readonly)\s+\w+|<\w+>\(/g);
	if (ts) add('typescript', (score.javascript ?? 0) + Math.min(6, ts * 2));
	if (/return\s*\(?\s*<[A-Z]?\w*[\s>]/.test(head) || /<\/[A-Z]\w*>/.test(head) || /className=/.test(head)) {
		if (score.typescript) add('tsx', score.typescript + 2);
		else add('jsx', (score.javascript ?? 0) + 3);
	}

	// GraphQL (só se não parecer JS/TS: `interface X {` existe nos dois)
	if (!score.javascript && !score.typescript && (/^\s*(query|mutation|subscription|fragment)\b[^{]*\{/m.test(head) || /^\s*(type|input|enum|interface|schema|scalar|extend type)\s+\w+[^=]*\{/m.test(head))) add('graphql', 6);

	// Outras linguagens comuns
	if (/^\s*(def|class)\s+\w+.*:\s*$/m.test(head) || /^\s*(from\s+[\w.]+\s+import|import\s+[\w.]+(\s+as\s+\w+)?\s*$)/m.test(head) || /\bprint\(|\bself\.|__name__|elif\s/.test(head)) add('python', 5 + count(/^\s*(def|elif|except|with)\b/gm));
	if (/^package\s+\w+\s*$/m.test(head) && /\bfunc\s/.test(head)) add('go', 9);
	else if (/\bfunc\s+(\(\w+\s+\*?\w+\)\s*)?\w+\(/.test(head) || /:=/.test(head)) add('go', 3);
	if (/\bfn\s+\w+\s*(<[^>]*>)?\(/.test(head) || /\blet\s+mut\b|\bimpl\s+\w+|\buse\s+\w+::|println!/.test(head)) add('rust', 7);
	if (/\bpublic\s+(static\s+)?(class|void|interface)\b|System\.out\.print|@Override/.test(head)) add('java', 6);
	if (/\busing\s+System|\bnamespace\s+[\w.]+|Console\.Write|\bpublic\s+async\s+Task\b|\{\s*get;\s*set;\s*\}/.test(head)) add('csharp', 7);
	if (/#include\s*[<"]/.test(head)) add(/\bstd::|\bcout\b|\btemplate\s*<|\bclass\s+\w+/.test(head) ? 'cpp' : 'c', 8);
	if (/^\s*(fun|val|var)\s+\w+/m.test(head) && /\bfun\s/.test(head)) add('kotlin', 6);
	if (/^\s*(require|module|def\s+\w+[?!]?$|end$|puts\s)/m.test(head) && /\bend\b/.test(head)) add('ruby', 4);
	if (/<\?php|\$\w+\s*=|->\w+\(|function\s+\w+\(.*\$/.test(head) && /\$\w+/.test(head) && /;\s*$/m.test(head)) add('php', 4);
	if (/^\s*(echo|export|if\s+\[|fi$|then$|done$|sudo|apt|npm|cd|ls|grep|curl)\b/m.test(head) || /\$\{?\w+\}?/.test(head) && /^\s*\w+=/.test(head)) add('shell', 3 + count(/^\s*(fi|done|then|esac)\s*$/gm) * 2);
	if (/^(FROM|RUN|CMD|ENTRYPOINT|COPY|WORKDIR|EXPOSE|ENV|ARG)\s/m.test(head) && /^FROM\s+\S+/m.test(head)) add('dockerfile', 9);
	if (/^[\w.-]+\s*:(\s+[\w./$()-]+)*\s*$/m.test(head) && /^\t\S/m.test(head)) add('makefile', 6);
	if (/^\s*\[[\w.\-"]+\]\s*$/m.test(head)) {
		if (/^\s*[\w.-]+\s*=\s*("|'|\d|true|false|\[|\{)/m.test(head)) add('toml', 6);
		else if (/^\s*[\w.-]+\s*=/m.test(head)) add('ini', 5);
	}
	if (lines.filter((l) => l.trim()).every((l) => /^\s*(#.*|(export\s+)?[A-Z][A-Z0-9_]*=.*)$/.test(l))) add('dotenv', 7);
	const commaRows = lines.filter((l) => l.includes(',')).length;
	if (lines.length > 1 && commaRows === lines.filter((l) => l.trim()).length && !/[{}();]|=>|\b(const|let|var|function)\b/.test(head)) {
		const cols = lines[0].split(',').length;
		if (cols > 1 && lines.slice(1, 10).every((l) => !l.trim() || l.split(',').length === cols)) add('csv', 7);
	}
	if (lines.length > 1 && lines.filter((l) => l.trim()).every((l) => l.includes('\t'))) add('tsv', 5);
	if (/^(diff --git|---\s+a\/|\+\+\+\s+b\/|@@ -\d)/m.test(head)) add('diff', 9);
	if (/\\(documentclass|begin\{|section\{|usepackage)/.test(head)) add('latex', 8);
	if (/^\s*(model|datasource|generator)\s+\w+\s*\{/m.test(head)) add('prisma', 9);
	if (/^\s*(resource|provider|variable|module|output|terraform)\s+"/m.test(head)) add('hcl', 9);
	if (/^syntax\s*=\s*"proto/m.test(head) || /^\s*message\s+\w+\s*\{/m.test(head)) add('proto', 8);
	if (/\b(server|location)\s+[^{]*\{/.test(head) && /\b(listen|proxy_pass|root|server_name)\s/.test(head)) add('nginx', 8);

	const max = 8;
	const ranked = Object.entries(score)
		.filter(([, s]) => s > 0)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 6);
	// Rival real do 1º: ignora "parentes" que ele já cobre (TS cobre JS, SCSS cobre CSS, dialeto cobre SQL).
	const rival = ranked.slice(1).find(([id]) => !FAMILY[ranked[0]?.[0]]?.includes(id));
	return ranked.map(([id, s], i) => {
			// Penaliza empate próximo: se o rival estiver muito perto, cai a confiança do 1º.
			const gap = i === 0 && rival ? (s - rival[1]) / s : 1;
			const c = Math.min(0.95, (s / max) * (0.55 + 0.45 * Math.min(1, gap * 2)));
			return { id, confidence: Math.round(c * 100) / 100 };
		});
}

const FAMILY: Record<string, string[]> = {
	typescript: ['javascript'],
	tsx: ['typescript', 'javascript', 'jsx'],
	jsx: ['javascript'],
	scss: ['css', 'less'],
	less: ['css', 'scss'],
	postgresql: ['sql'],
	mysql: ['sql'],
	tsql: ['sql'],
	vue: ['html', 'javascript'],
	jsonc: ['json5'],
	svg: ['xml']
};

/** Confiança mínima para aplicar a linguagem sem perguntar. */
export const CONFIDENT = 0.6;
