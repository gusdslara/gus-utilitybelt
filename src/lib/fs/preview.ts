// Pré-visualização: Markdown (sanitizado) e HTML (em iframe sandbox ou nova aba).
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { i18n } from '#lib/i18n/index.svelte.ts';

export type PreviewKind = 'markdown' | 'html' | null;

export function previewKind(name: string): PreviewKind {
	const ext = name.split('.').pop()?.toLowerCase();
	if (ext === 'md' || ext === 'markdown') return 'markdown';
	if (ext === 'html' || ext === 'htm') return 'html';
	return null;
}

export function renderMarkdown(src: string): string {
	const raw = marked.parse(src, { async: false, gfm: true, breaks: false }) as string;
	return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}

const MD_STYLE = `
body{margin:0;padding:32px 40px;background:#0f1117;color:#e6e8ef;font:16px/1.7 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
main{max-width:820px;margin:0 auto;}
h1,h2,h3{line-height:1.25;letter-spacing:-.01em}h1{border-bottom:1px solid #2c3142;padding-bottom:.3em}
a{color:#ff6fa0}code{font-family:ui-monospace,Menlo,monospace;background:#1b1f2b;padding:.15em .4em;border-radius:6px;font-size:.9em}
pre{background:#161a24;border:1px solid #2c3142;border-radius:10px;padding:14px;overflow:auto}pre code{background:none;padding:0}
blockquote{margin:0;padding-left:16px;border-left:3px solid #dd206b;color:#a4aabd}
table{border-collapse:collapse}th,td{border:1px solid #2c3142;padding:6px 10px}img{max-width:100%}
`;

/** Documento HTML completo a partir de Markdown, pronto para abrir numa aba. */
export function markdownDocument(src: string, title: string): string {
	const body = renderMarkdown(src);
	return `<!doctype html><html lang="${i18n.tag}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${MD_STYLE}</style></head><body><main>${body}</main></body></html>`;
}

export function escapeHtml(s: string) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Abre o conteúdo numa nova aba via Blob URL (HTML bruto para .html, documento renderizado para .md). */
export function openPreviewTab(name: string, content: string) {
	const kind = previewKind(name);
	if (!kind) return;
	const html = kind === 'html' ? content : markdownDocument(content, name);
	const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
	window.open(url, '_blank', 'noopener');
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
