// Descrição legível de expressões cron de 5 campos (pt, en, es, fr). Usada pela UI e pela API de IA.
// Não importa o módulo de i18n: também roda no Bun, fora do Svelte.

export const CRON_FIELDS = ['Minuto', 'Hora', 'Dia do mês', 'Mês', 'Dia da semana'] as const;

export type CronLang = 'pt' | 'en' | 'es' | 'fr';

const TEXT: Record<CronLang, {
	everyMinute: string;
	everyN: (n: string) => string;
	atMinute: (m: string) => string;
	at: (t: string) => string;
	daily: string;
	weekdays: string;
	dow: (d: string) => string;
	dom: (d: string) => string;
	custom: string;
}> = {
	pt: {
		everyMinute: 'Executa a cada minuto.',
		everyN: (n) => `Executa a cada ${n} minutos.`,
		atMinute: (m) => `Executa no minuto ${m} de cada hora.`,
		at: (t) => `Executa às ${t}`,
		daily: ' todos os dias',
		weekdays: ' de segunda a sexta',
		dow: (d) => ` aos dias da semana ${d} (0 = domingo)`,
		dom: (d) => ` no dia ${d} de cada mês`,
		custom: 'Expressão personalizada — confira os próximos disparos abaixo.'
	},
	en: {
		everyMinute: 'Runs every minute.',
		everyN: (n) => `Runs every ${n} minutes.`,
		atMinute: (m) => `Runs at minute ${m} of every hour.`,
		at: (t) => `Runs at ${t}`,
		daily: ' every day',
		weekdays: ' Monday through Friday',
		dow: (d) => ` on day of week ${d} (0 = Sunday)`,
		dom: (d) => ` on day ${d} of every month`,
		custom: 'Custom expression — check the next runs below.'
	},
	es: {
		everyMinute: 'Se ejecuta cada minuto.',
		everyN: (n) => `Se ejecuta cada ${n} minutos.`,
		atMinute: (m) => `Se ejecuta en el minuto ${m} de cada hora.`,
		at: (t) => `Se ejecuta a las ${t}`,
		daily: ' todos los días',
		weekdays: ' de lunes a viernes',
		dow: (d) => ` los días de la semana ${d} (0 = domingo)`,
		dom: (d) => ` el día ${d} de cada mes`,
		custom: 'Expresión personalizada — revisa las próximas ejecuciones abajo.'
	},
	fr: {
		everyMinute: 'S’exécute chaque minute.',
		everyN: (n) => `S’exécute toutes les ${n} minutes.`,
		atMinute: (m) => `S’exécute à la minute ${m} de chaque heure.`,
		at: (t) => `S’exécute à ${t}`,
		daily: ' tous les jours',
		weekdays: ' du lundi au vendredi',
		dow: (d) => ` le jour de la semaine ${d} (0 = dimanche)`,
		dom: (d) => ` le ${d} de chaque mois`,
		custom: 'Expression personnalisée — consultez les prochaines exécutions ci-dessous.'
	}
};

export function describeCron(p: string[], lang: CronLang = 'pt'): string {
	const L = TEXT[lang] ?? TEXT.pt;
	const [m, h, dom, mon, dow] = p;
	const hm = (hh: string, mm: string) => (hh.match(/^\d+$/) && mm.match(/^\d+$/) ? `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}` : null);
	if (p.join(' ') === '* * * * *') return L.everyMinute;
	if (m.startsWith('*/') && h === '*') return L.everyN(m.slice(2));
	if (m.match(/^\d+$/) && h === '*') return L.atMinute(m);
	const t = hm(h, m);
	if (t) {
		let s = L.at(t);
		if (dom === '*' && mon === '*' && dow === '*') s += L.daily;
		else if (dom === '*' && mon === '*' && dow === '1-5') s += L.weekdays;
		else if (dom === '*' && mon === '*' && dow.match(/^\d$/)) s += L.dow(dow);
		else if (mon === '*' && dow === '*' && dom.match(/^\d+$/)) s += L.dom(dom);
		return s + '.';
	}
	return L.custom;
}
