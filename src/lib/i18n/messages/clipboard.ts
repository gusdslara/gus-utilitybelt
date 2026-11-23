import { ns } from './ns.ts';

// Histórico do clipboard (ClipboardView.svelte e rótulos de tipo em clipboard/history.svelte.ts).
export default ns({
	pt: {
		title: 'Clipboard',
		itemOne: '{count} item', itemMany: '{count} itens', savedInBrowser: 'salvo no navegador',
		searchPlaceholder: 'Buscar no histórico  ( / )', searchLabel: 'Buscar no histórico',
		exportTitle: 'Exportar JSON', exportLabel: 'Exportar histórico em JSON',
		clearTitle: 'Limpar não fixados', clearLabel: 'Limpar itens não fixados',
		clearConfirm: 'Apagar todos os itens não fixados do histórico? Itens fixados são mantidos.',
		filterLabel: 'Filtrar por tipo', all: 'Tudo',
		groups: { pinned: 'Fixados', today: 'Hoje', yesterday: 'Ontem', thisWeek: 'Esta semana', older: 'Anteriores' },
		emptyTitle: 'Nada copiado ainda', emptyText: 'Tudo que você copiar nas ferramentas (botão Copiar ou Ctrl+C) aparece aqui e fica salvo.',
		noResults: 'Nenhum resultado para “{query}”.',
		collapse: 'Recolher', showAll: 'Ver tudo ({count} caracteres)',
		now: 'agora', copiedTimes: 'copiado {count}×',
		copyAgain: 'Copiar de novo', pin: 'Fixar', unpin: 'Desafixar', delete: 'Apagar', deleteLabel: 'Apagar item',
		loadingMore: 'Carregando mais…', general: 'Geral',
		types: { url: 'Link', color: 'Cor', uuid: 'UUID', json: 'JSON', email: 'E-mail', number: 'Número', doc: 'CPF/CNPJ', code: 'Código', text: 'Texto' }
	},
	en: {
		title: 'Clipboard',
		itemOne: '{count} item', itemMany: '{count} items', savedInBrowser: 'saved in your browser',
		searchPlaceholder: 'Search history  ( / )', searchLabel: 'Search history',
		exportTitle: 'Export JSON', exportLabel: 'Export history as JSON',
		clearTitle: 'Clear unpinned', clearLabel: 'Clear unpinned items',
		clearConfirm: 'Delete all unpinned items from the history? Pinned items are kept.',
		filterLabel: 'Filter by type', all: 'All',
		groups: { pinned: 'Pinned', today: 'Today', yesterday: 'Yesterday', thisWeek: 'This week', older: 'Older' },
		emptyTitle: 'Nothing copied yet', emptyText: 'Everything you copy in the tools (Copy button or Ctrl+C) shows up here and stays saved.',
		noResults: 'No results for “{query}”.',
		collapse: 'Collapse', showAll: 'Show all ({count} characters)',
		now: 'just now', copiedTimes: 'copied {count}×',
		copyAgain: 'Copy again', pin: 'Pin', unpin: 'Unpin', delete: 'Delete', deleteLabel: 'Delete item',
		loadingMore: 'Loading more…', general: 'General',
		types: { url: 'Link', color: 'Color', uuid: 'UUID', json: 'JSON', email: 'Email', number: 'Number', doc: 'CPF/CNPJ', code: 'Code', text: 'Text' }
	},
	es: {
		title: 'Portapapeles',
		itemOne: '{count} elemento', itemMany: '{count} elementos', savedInBrowser: 'guardado en el navegador',
		searchPlaceholder: 'Buscar en el historial  ( / )', searchLabel: 'Buscar en el historial',
		exportTitle: 'Exportar JSON', exportLabel: 'Exportar historial en JSON',
		clearTitle: 'Borrar no fijados', clearLabel: 'Borrar elementos no fijados',
		clearConfirm: '¿Borrar todos los elementos no fijados del historial? Los fijados se conservan.',
		filterLabel: 'Filtrar por tipo', all: 'Todo',
		groups: { pinned: 'Fijados', today: 'Hoy', yesterday: 'Ayer', thisWeek: 'Esta semana', older: 'Anteriores' },
		emptyTitle: 'Nada copiado todavía', emptyText: 'Todo lo que copies en las herramientas (botón Copiar o Ctrl+C) aparece aquí y queda guardado.',
		noResults: 'Sin resultados para “{query}”.',
		collapse: 'Contraer', showAll: 'Ver todo ({count} caracteres)',
		now: 'ahora', copiedTimes: 'copiado {count}×',
		copyAgain: 'Copiar de nuevo', pin: 'Fijar', unpin: 'Desfijar', delete: 'Borrar', deleteLabel: 'Borrar elemento',
		loadingMore: 'Cargando más…', general: 'General',
		types: { url: 'Enlace', color: 'Color', uuid: 'UUID', json: 'JSON', email: 'Correo', number: 'Número', doc: 'CPF/CNPJ', code: 'Código', text: 'Texto' }
	},
	fr: {
		title: 'Presse-papiers',
		itemOne: '{count} élément', itemMany: '{count} éléments', savedInBrowser: 'enregistré dans le navigateur',
		searchPlaceholder: 'Rechercher dans l’historique  ( / )', searchLabel: 'Rechercher dans l’historique',
		exportTitle: 'Exporter en JSON', exportLabel: 'Exporter l’historique en JSON',
		clearTitle: 'Effacer les non épinglés', clearLabel: 'Effacer les éléments non épinglés',
		clearConfirm: 'Supprimer tous les éléments non épinglés de l’historique ? Les éléments épinglés sont conservés.',
		filterLabel: 'Filtrer par type', all: 'Tout',
		groups: { pinned: 'Épinglés', today: 'Aujourd’hui', yesterday: 'Hier', thisWeek: 'Cette semaine', older: 'Plus anciens' },
		emptyTitle: 'Rien de copié pour l’instant', emptyText: 'Tout ce que vous copiez dans les outils (bouton Copier ou Ctrl+C) apparaît ici et reste enregistré.',
		noResults: 'Aucun résultat pour « {query} ».',
		collapse: 'Réduire', showAll: 'Tout afficher ({count} caractères)',
		now: 'à l’instant', copiedTimes: 'copié {count}×',
		copyAgain: 'Copier à nouveau', pin: 'Épingler', unpin: 'Désépingler', delete: 'Supprimer', deleteLabel: 'Supprimer l’élément',
		loadingMore: 'Chargement…', general: 'Général',
		types: { url: 'Lien', color: 'Couleur', uuid: 'UUID', json: 'JSON', email: 'E-mail', number: 'Nombre', doc: 'CPF/CNPJ', code: 'Code', text: 'Texte' }
	}
});
