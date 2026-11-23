import { toolsJson } from '#lib/ai/docs.ts';

export const prerender = true;

export function GET() {
	return new Response(JSON.stringify(toolsJson(), null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
