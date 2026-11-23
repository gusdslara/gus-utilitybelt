import { llmsTxt } from '#lib/ai/docs.ts';
import { llmsImageSection, llmsMotionSection } from '#lib/seo/llms.ts';

export const prerender = true;

export function GET() {
	return new Response(`${llmsTxt()}\n\n${llmsImageSection()}\n\n${llmsMotionSection()}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
