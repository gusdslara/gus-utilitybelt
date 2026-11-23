import { ns } from './ns.ts';

// Editor: barra de ferramentas, árvore, diff, seletor de linguagem, diálogos, toasts, status e workspace.
export default ns({
	pt: {
		toolbar: {
			label: 'Ações do editor', toggleTreeTitle: 'Mostrar/ocultar arquivos', toggleTree: 'Mostrar ou ocultar arquivos',
			newDraftTitle: 'Novo rascunho sem nome (Alt+N)', newDraft: 'Novo rascunho sem nome', newFile: 'Novo arquivo', newFolder: 'Nova pasta',
			openLocal: 'Abrir pasta do PC', useVirtual: 'Voltar para a pasta padrão', saveTitle: 'Salvar (Ctrl+S)',
			saveAsTitle: 'Baixar / Salvar como… (Ctrl+Shift+S)', saveAs: 'Salvar como', saveAll: 'Salvar tudo',
			formatTitle: 'Formatar documento (Shift+Alt+F)', format: 'Formatar documento', langTitle: 'Linguagem (Shift+Alt+L)', chooseLang: 'Escolher linguagem',
			diffTitle: 'Comparar / Diff (Shift+Alt+D)', diff: 'Comparar diferenças', previewSide: 'Pré-visualização ao lado', previewTab: 'Abrir pré-visualização em nova aba',
			localPrefix: 'PC: '
		},
		pane: { label: 'Painel', code: 'Código', preview: 'Preview', closeNotice: 'Fechar aviso' },
		tree: {
			label: 'Arquivos', kind: 'Tipo', file: 'Arquivo', folder: 'Pasta', placeholderIn: 'em {dir}/…', placeholder: 'nome…',
			newName: 'Nome do novo item', create: 'Criar', drafts: 'Rascunhos', newDraftTitle: 'Novo rascunho (Alt+N)', newDraft: 'Novo rascunho',
			closeItem: 'Fechar {name}', closeDraft: 'Fechar rascunho', deleteItem: 'Apagar {name}', empty: 'Pasta vazia. Crie um arquivo acima.'
		},
		confirm: {
			discardDraft: 'Descartar "{name}"? O conteúdo não salvo será perdido.',
			delete: 'Apagar "{path}"? Esta ação não pode ser desfeita.'
		},
		diff: {
			label: 'Diferenças', compare: 'Comparar', with: 'com', currentSuffix: '(atual)', close: 'Fechar diff',
			pastePlaceholder: 'Cole aqui o texto original para comparar com o editor…', pasteAria: 'Texto para comparar',
			savedVersion: 'Versão salva', pastedOption: 'Texto colado…', draftOption: '{name} (rascunho)', savedLabel: '{name} (salvo)', pasted: 'Texto colado',
			ignoreWs: 'Ignorar espaços', mode: 'Modo do diff', split: 'Lado a lado', unified: 'Unificado', noDiff: 'Sem diferenças',
			equal: '"{left}" e "{right}" são iguais.', equalIgnoringWs: 'Ignorando espaços, "{left}" e "{right}" são iguais.', sameLines: '{count} linhas iguais'
		},
		code: {
			label: 'Código', edit: 'Editar {path}',
			placeholder: 'Cole ou digite qualquer coisa: JSON, YAML, SQL, HTML, código…\nShift+Alt+F formata · a linguagem é detectada sozinha · Ctrl+S salva com nome'
		},
		preview: { label: 'Pré-visualização', iframe: 'Pré-visualização HTML' },
		empty: { title: 'Nenhum arquivo aberto', hint: 'Escolha um arquivo na lateral ou crie um novo.' },
		status: {
			ready: 'Pronto', position: 'Ln {line}, Col {col}', langTitle: 'Trocar linguagem (Shift+Alt+L)', detect: 'Detectar linguagem', auto: 'auto',
			formatTitle: 'Formatar documento (Shift+Alt+F ou Ctrl+Alt+L)', format: 'Formatar', chars: '{count} caracteres',
			draft: 'Rascunho (não salvo na pasta)', savedDisk: 'Salvo no disco', savedBrowser: 'Salvo no navegador'
		},
		toast: {
			nothingToFormat: 'Nada para formatar: cole ou escreva algo primeiro.', formatFailed: 'Não deu para formatar como {lang}: {error}',
			changeLang: 'Trocar linguagem', alreadyFormatted: '{lang}: já estava formatado.',
			basic: '{lang} não tem formatador no navegador: removi espaços finais e linhas em branco extras.', formatted: 'Formatado como {lang}.',
			langSet: 'Linguagem: {lang}', langSetFmt: ' · Shift+Alt+F formata', detected: 'Detectado: {lang}.', savedTo: 'Salvo em {path}'
		},
		picker: {
			whichLang: 'Qual é a linguagem deste conteúdo?', unsure: 'Não tenho certeza. Sugestões detectadas no topo.',
			unknown: 'Não reconheci automaticamente. Escolha para formatar.', formatAs: 'Formatar como…', fileLang: 'Linguagem do arquivo',
			draftHint: 'Define o formato do rascunho (vira a extensão ao salvar).', fileHint: 'Muda só o modo do editor; o nome do arquivo não é alterado.',
			defaultTitle: 'Selecionar linguagem', searchPlaceholder: 'Buscar por nome ou extensão (json, yml, .tsx, sql…)', searchAria: 'Buscar linguagem',
			detectedBadge: 'Detectado pelo conteúdo', current: 'atual', hasFormatter: 'Tem formatador',
			notFoundBefore: 'Nada encontrado para "{query}". Use', notFoundAfter: 'ou digite outra extensão.',
			navigate: 'navegar', choose: 'escolher', realFormat: '= formata de verdade'
		},
		saveDialog: {
			title: 'Salvar rascunho', fileName: 'Nome do arquivo', extHint: 'A extensão vem da linguagem ({lang}). Pode mudar à vontade.',
			folder: 'Pasta', root: '{name} (raiz)', nameRequired: 'Dê um nome ao arquivo'
		},
		langs: { plaintext: 'Texto puro', jsonc: 'JSON com comentários' },
		ws: {
			untitled: 'Sem título-{n}', draftNotFound: 'Rascunho não encontrado', createFailed: 'Falha ao criar o arquivo', invalidName: 'Nome inválido',
			invalidChars: 'Caracteres não permitidos no nome', exists: 'Já existe um item com esse nome', noParent: 'A pasta "{dir}" não existe',
			diskCreate: 'Não foi possível criar no disco: {error}', diskDelete: 'Falha ao apagar no disco: {error}', saveFailed: 'Não foi possível salvar: {error}',
			noLocal: 'Seu navegador não suporta abrir pastas do PC (use Chrome/Edge).', openFailed: 'Não foi possível abrir a pasta: {error}',
			noIdb: 'IndexedDB indisponível: o editor funciona só nesta sessão.', bigFile: '// Arquivo grande ({size} KB): não carregado no editor.'
		},
		seed: {
			dir: 'projeto', readme: '# Meu projeto\n\nEscreva aqui. Tudo fica salvo no seu navegador (IndexedDB).\n',
			notesName: 'notas.txt', notes: 'Ideias, snippets e rascunhos.\n'
		}
	},
	en: {
		toolbar: {
			label: 'Editor actions', toggleTreeTitle: 'Show/hide files', toggleTree: 'Show or hide files',
			newDraftTitle: 'New untitled draft (Alt+N)', newDraft: 'New untitled draft', newFile: 'New file', newFolder: 'New folder',
			openLocal: 'Open folder from your computer', useVirtual: 'Back to the default folder', saveTitle: 'Save (Ctrl+S)',
			saveAsTitle: 'Download / Save as… (Ctrl+Shift+S)', saveAs: 'Save as', saveAll: 'Save all',
			formatTitle: 'Format document (Shift+Alt+F)', format: 'Format document', langTitle: 'Language (Shift+Alt+L)', chooseLang: 'Choose language',
			diffTitle: 'Compare / Diff (Shift+Alt+D)', diff: 'Compare differences', previewSide: 'Preview to the side', previewTab: 'Open preview in a new tab',
			localPrefix: 'PC: '
		},
		pane: { label: 'Pane', code: 'Code', preview: 'Preview', closeNotice: 'Dismiss notice' },
		tree: {
			label: 'Files', kind: 'Type', file: 'File', folder: 'Folder', placeholderIn: 'in {dir}/…', placeholder: 'name…',
			newName: 'New item name', create: 'Create', drafts: 'Drafts', newDraftTitle: 'New draft (Alt+N)', newDraft: 'New draft',
			closeItem: 'Close {name}', closeDraft: 'Close draft', deleteItem: 'Delete {name}', empty: 'Empty folder. Create a file above.'
		},
		confirm: {
			discardDraft: 'Discard "{name}"? Unsaved content will be lost.',
			delete: 'Delete "{path}"? This cannot be undone.'
		},
		diff: {
			label: 'Differences', compare: 'Compare', with: 'with', currentSuffix: '(current)', close: 'Close diff',
			pastePlaceholder: 'Paste the original text here to compare it with the editor…', pasteAria: 'Text to compare',
			savedVersion: 'Saved version', pastedOption: 'Pasted text…', draftOption: '{name} (draft)', savedLabel: '{name} (saved)', pasted: 'Pasted text',
			ignoreWs: 'Ignore whitespace', mode: 'Diff mode', split: 'Side by side', unified: 'Unified', noDiff: 'No differences',
			equal: '"{left}" and "{right}" are identical.', equalIgnoringWs: 'Ignoring whitespace, "{left}" and "{right}" are identical.', sameLines: '{count} unchanged lines'
		},
		code: {
			label: 'Code', edit: 'Edit {path}',
			placeholder: 'Paste or type anything: JSON, YAML, SQL, HTML, code…\nShift+Alt+F formats · the language is detected automatically · Ctrl+S saves with a name'
		},
		preview: { label: 'Preview', iframe: 'HTML preview' },
		empty: { title: 'No file open', hint: 'Pick a file from the sidebar or create a new one.' },
		status: {
			ready: 'Ready', position: 'Ln {line}, Col {col}', langTitle: 'Change language (Shift+Alt+L)', detect: 'Detect language', auto: 'auto',
			formatTitle: 'Format document (Shift+Alt+F or Ctrl+Alt+L)', format: 'Format', chars: '{count} characters',
			draft: 'Draft (not saved to the folder)', savedDisk: 'Saved to disk', savedBrowser: 'Saved in the browser'
		},
		toast: {
			nothingToFormat: 'Nothing to format: paste or type something first.', formatFailed: 'Could not format as {lang}: {error}',
			changeLang: 'Change language', alreadyFormatted: '{lang}: already formatted.',
			basic: '{lang} has no in-browser formatter: trimmed trailing whitespace and extra blank lines.', formatted: 'Formatted as {lang}.',
			langSet: 'Language: {lang}', langSetFmt: ' · Shift+Alt+F formats', detected: 'Detected: {lang}.', savedTo: 'Saved to {path}'
		},
		picker: {
			whichLang: 'What language is this content?', unsure: 'Not sure. Detected suggestions are at the top.',
			unknown: 'Could not detect it automatically. Pick one to format.', formatAs: 'Format as…', fileLang: 'File language',
			draftHint: 'Sets the draft format (becomes the extension when saving).', fileHint: 'Only changes the editor mode; the file name stays the same.',
			defaultTitle: 'Select language', searchPlaceholder: 'Search by name or extension (json, yml, .tsx, sql…)', searchAria: 'Search language',
			detectedBadge: 'Detected from content', current: 'current', hasFormatter: 'Has a formatter',
			notFoundBefore: 'Nothing found for "{query}". Use', notFoundAfter: 'or type another extension.',
			navigate: 'navigate', choose: 'select', realFormat: '= real formatter'
		},
		saveDialog: {
			title: 'Save draft', fileName: 'File name', extHint: 'The extension comes from the language ({lang}). Feel free to change it.',
			folder: 'Folder', root: '{name} (root)', nameRequired: 'Give the file a name'
		},
		langs: { plaintext: 'Plain text', jsonc: 'JSON with comments' },
		ws: {
			untitled: 'Untitled-{n}', draftNotFound: 'Draft not found', createFailed: 'Failed to create the file', invalidName: 'Invalid name',
			invalidChars: 'Characters not allowed in the name', exists: 'An item with that name already exists', noParent: 'Folder "{dir}" does not exist',
			diskCreate: 'Could not create on disk: {error}', diskDelete: 'Failed to delete on disk: {error}', saveFailed: 'Could not save: {error}',
			noLocal: 'Your browser cannot open folders from your computer (use Chrome/Edge).', openFailed: 'Could not open the folder: {error}',
			noIdb: 'IndexedDB unavailable: the editor only works for this session.', bigFile: '// Large file ({size} KB): not loaded in the editor.'
		},
		seed: {
			dir: 'project', readme: '# My project\n\nWrite here. Everything is saved in your browser (IndexedDB).\n',
			notesName: 'notes.txt', notes: 'Ideas, snippets and drafts.\n'
		}
	},
	es: {
		toolbar: {
			label: 'Acciones del editor', toggleTreeTitle: 'Mostrar/ocultar archivos', toggleTree: 'Mostrar u ocultar archivos',
			newDraftTitle: 'Nuevo borrador sin nombre (Alt+N)', newDraft: 'Nuevo borrador sin nombre', newFile: 'Nuevo archivo', newFolder: 'Nueva carpeta',
			openLocal: 'Abrir carpeta del PC', useVirtual: 'Volver a la carpeta predeterminada', saveTitle: 'Guardar (Ctrl+S)',
			saveAsTitle: 'Descargar / Guardar como… (Ctrl+Shift+S)', saveAs: 'Guardar como', saveAll: 'Guardar todo',
			formatTitle: 'Formatear documento (Shift+Alt+F)', format: 'Formatear documento', langTitle: 'Lenguaje (Shift+Alt+L)', chooseLang: 'Elegir lenguaje',
			diffTitle: 'Comparar / Diff (Shift+Alt+D)', diff: 'Comparar diferencias', previewSide: 'Vista previa al lado', previewTab: 'Abrir vista previa en una pestaña nueva',
			localPrefix: 'PC: '
		},
		pane: { label: 'Panel', code: 'Código', preview: 'Vista previa', closeNotice: 'Cerrar aviso' },
		tree: {
			label: 'Archivos', kind: 'Tipo', file: 'Archivo', folder: 'Carpeta', placeholderIn: 'en {dir}/…', placeholder: 'nombre…',
			newName: 'Nombre del nuevo elemento', create: 'Crear', drafts: 'Borradores', newDraftTitle: 'Nuevo borrador (Alt+N)', newDraft: 'Nuevo borrador',
			closeItem: 'Cerrar {name}', closeDraft: 'Cerrar borrador', deleteItem: 'Eliminar {name}', empty: 'Carpeta vacía. Crea un archivo arriba.'
		},
		confirm: {
			discardDraft: '¿Descartar "{name}"? Se perderá el contenido no guardado.',
			delete: '¿Eliminar "{path}"? Esta acción no se puede deshacer.'
		},
		diff: {
			label: 'Diferencias', compare: 'Comparar', with: 'con', currentSuffix: '(actual)', close: 'Cerrar diff',
			pastePlaceholder: 'Pega aquí el texto original para compararlo con el editor…', pasteAria: 'Texto a comparar',
			savedVersion: 'Versión guardada', pastedOption: 'Texto pegado…', draftOption: '{name} (borrador)', savedLabel: '{name} (guardado)', pasted: 'Texto pegado',
			ignoreWs: 'Ignorar espacios', mode: 'Modo del diff', split: 'Lado a lado', unified: 'Unificado', noDiff: 'Sin diferencias',
			equal: '"{left}" y "{right}" son iguales.', equalIgnoringWs: 'Ignorando espacios, "{left}" y "{right}" son iguales.', sameLines: '{count} líneas iguales'
		},
		code: {
			label: 'Código', edit: 'Editar {path}',
			placeholder: 'Pega o escribe lo que quieras: JSON, YAML, SQL, HTML, código…\nShift+Alt+F formatea · el lenguaje se detecta solo · Ctrl+S guarda con nombre'
		},
		preview: { label: 'Vista previa', iframe: 'Vista previa HTML' },
		empty: { title: 'Ningún archivo abierto', hint: 'Elige un archivo en el panel lateral o crea uno nuevo.' },
		status: {
			ready: 'Listo', position: 'Lín. {line}, col. {col}', langTitle: 'Cambiar lenguaje (Shift+Alt+L)', detect: 'Detectar lenguaje', auto: 'auto',
			formatTitle: 'Formatear documento (Shift+Alt+F o Ctrl+Alt+L)', format: 'Formatear', chars: '{count} caracteres',
			draft: 'Borrador (no guardado en la carpeta)', savedDisk: 'Guardado en el disco', savedBrowser: 'Guardado en el navegador'
		},
		toast: {
			nothingToFormat: 'Nada que formatear: pega o escribe algo primero.', formatFailed: 'No se pudo formatear como {lang}: {error}',
			changeLang: 'Cambiar lenguaje', alreadyFormatted: '{lang}: ya estaba formateado.',
			basic: '{lang} no tiene formateador en el navegador: quité espacios finales y líneas en blanco de más.', formatted: 'Formateado como {lang}.',
			langSet: 'Lenguaje: {lang}', langSetFmt: ' · Shift+Alt+F formatea', detected: 'Detectado: {lang}.', savedTo: 'Guardado en {path}'
		},
		picker: {
			whichLang: '¿En qué lenguaje está este contenido?', unsure: 'No estoy seguro. Las sugerencias detectadas están arriba.',
			unknown: 'No lo reconocí automáticamente. Elige uno para formatear.', formatAs: 'Formatear como…', fileLang: 'Lenguaje del archivo',
			draftHint: 'Define el formato del borrador (será la extensión al guardar).', fileHint: 'Solo cambia el modo del editor; el nombre del archivo no se modifica.',
			defaultTitle: 'Seleccionar lenguaje', searchPlaceholder: 'Buscar por nombre o extensión (json, yml, .tsx, sql…)', searchAria: 'Buscar lenguaje',
			detectedBadge: 'Detectado por el contenido', current: 'actual', hasFormatter: 'Tiene formateador',
			notFoundBefore: 'No se encontró nada para "{query}". Usa', notFoundAfter: 'o escribe otra extensión.',
			navigate: 'navegar', choose: 'elegir', realFormat: '= formatea de verdad'
		},
		saveDialog: {
			title: 'Guardar borrador', fileName: 'Nombre del archivo', extHint: 'La extensión viene del lenguaje ({lang}). Puedes cambiarla libremente.',
			folder: 'Carpeta', root: '{name} (raíz)', nameRequired: 'Ponle un nombre al archivo'
		},
		langs: { plaintext: 'Texto plano', jsonc: 'JSON con comentarios' },
		ws: {
			untitled: 'Sin título-{n}', draftNotFound: 'Borrador no encontrado', createFailed: 'No se pudo crear el archivo', invalidName: 'Nombre no válido',
			invalidChars: 'Caracteres no permitidos en el nombre', exists: 'Ya existe un elemento con ese nombre', noParent: 'La carpeta "{dir}" no existe',
			diskCreate: 'No se pudo crear en el disco: {error}', diskDelete: 'No se pudo eliminar en el disco: {error}', saveFailed: 'No se pudo guardar: {error}',
			noLocal: 'Tu navegador no permite abrir carpetas del PC (usa Chrome/Edge).', openFailed: 'No se pudo abrir la carpeta: {error}',
			noIdb: 'IndexedDB no disponible: el editor solo funciona en esta sesión.', bigFile: '// Archivo grande ({size} KB): no se cargó en el editor.'
		},
		seed: {
			dir: 'proyecto', readme: '# Mi proyecto\n\nEscribe aquí. Todo se guarda en tu navegador (IndexedDB).\n',
			notesName: 'notas.txt', notes: 'Ideas, snippets y borradores.\n'
		}
	},
	fr: {
		toolbar: {
			label: 'Actions de l’éditeur', toggleTreeTitle: 'Afficher/masquer les fichiers', toggleTree: 'Afficher ou masquer les fichiers',
			newDraftTitle: 'Nouveau brouillon sans titre (Alt+N)', newDraft: 'Nouveau brouillon sans titre', newFile: 'Nouveau fichier', newFolder: 'Nouveau dossier',
			openLocal: 'Ouvrir un dossier de l’ordinateur', useVirtual: 'Revenir au dossier par défaut', saveTitle: 'Enregistrer (Ctrl+S)',
			saveAsTitle: 'Télécharger / Enregistrer sous… (Ctrl+Shift+S)', saveAs: 'Enregistrer sous', saveAll: 'Tout enregistrer',
			formatTitle: 'Formater le document (Shift+Alt+F)', format: 'Formater le document', langTitle: 'Langage (Shift+Alt+L)', chooseLang: 'Choisir le langage',
			diffTitle: 'Comparer / Diff (Shift+Alt+D)', diff: 'Comparer les différences', previewSide: 'Aperçu à côté', previewTab: 'Ouvrir l’aperçu dans un nouvel onglet',
			localPrefix: 'PC : '
		},
		pane: { label: 'Panneau', code: 'Code', preview: 'Aperçu', closeNotice: 'Fermer l’avertissement' },
		tree: {
			label: 'Fichiers', kind: 'Type', file: 'Fichier', folder: 'Dossier', placeholderIn: 'dans {dir}/…', placeholder: 'nom…',
			newName: 'Nom du nouvel élément', create: 'Créer', drafts: 'Brouillons', newDraftTitle: 'Nouveau brouillon (Alt+N)', newDraft: 'Nouveau brouillon',
			closeItem: 'Fermer {name}', closeDraft: 'Fermer le brouillon', deleteItem: 'Supprimer {name}', empty: 'Dossier vide. Créez un fichier ci-dessus.'
		},
		confirm: {
			discardDraft: 'Abandonner « {name} » ? Le contenu non enregistré sera perdu.',
			delete: 'Supprimer « {path} » ? Cette action est irréversible.'
		},
		diff: {
			label: 'Différences', compare: 'Comparer', with: 'avec', currentSuffix: '(actuel)', close: 'Fermer le diff',
			pastePlaceholder: 'Collez ici le texte d’origine pour le comparer à l’éditeur…', pasteAria: 'Texte à comparer',
			savedVersion: 'Version enregistrée', pastedOption: 'Texte collé…', draftOption: '{name} (brouillon)', savedLabel: '{name} (enregistré)', pasted: 'Texte collé',
			ignoreWs: 'Ignorer les espaces', mode: 'Mode du diff', split: 'Côte à côte', unified: 'Unifié', noDiff: 'Aucune différence',
			equal: '« {left} » et « {right} » sont identiques.', equalIgnoringWs: 'En ignorant les espaces, « {left} » et « {right} » sont identiques.', sameLines: '{count} lignes identiques'
		},
		code: {
			label: 'Code', edit: 'Modifier {path}',
			placeholder: 'Collez ou tapez n’importe quoi : JSON, YAML, SQL, HTML, code…\nShift+Alt+F formate · le langage est détecté automatiquement · Ctrl+S enregistre avec un nom'
		},
		preview: { label: 'Aperçu', iframe: 'Aperçu HTML' },
		empty: { title: 'Aucun fichier ouvert', hint: 'Choisissez un fichier dans le panneau latéral ou créez-en un.' },
		status: {
			ready: 'Prêt', position: 'Ln {line}, Col {col}', langTitle: 'Changer de langage (Shift+Alt+L)', detect: 'Détecter le langage', auto: 'auto',
			formatTitle: 'Formater le document (Shift+Alt+F ou Ctrl+Alt+L)', format: 'Formater', chars: '{count} caractères',
			draft: 'Brouillon (non enregistré dans le dossier)', savedDisk: 'Enregistré sur le disque', savedBrowser: 'Enregistré dans le navigateur'
		},
		toast: {
			nothingToFormat: 'Rien à formater : collez ou écrivez quelque chose d’abord.', formatFailed: 'Impossible de formater en {lang} : {error}',
			changeLang: 'Changer de langage', alreadyFormatted: '{lang} : déjà formaté.',
			basic: '{lang} n’a pas de formateur dans le navigateur : espaces de fin et lignes vides en trop supprimés.', formatted: 'Formaté en {lang}.',
			langSet: 'Langage : {lang}', langSetFmt: ' · Shift+Alt+F formate', detected: 'Détecté : {lang}.', savedTo: 'Enregistré dans {path}'
		},
		picker: {
			whichLang: 'Dans quel langage est ce contenu ?', unsure: 'Pas sûr. Les suggestions détectées sont en haut.',
			unknown: 'Non reconnu automatiquement. Choisissez-en un pour formater.', formatAs: 'Formater en…', fileLang: 'Langage du fichier',
			draftHint: 'Définit le format du brouillon (devient l’extension à l’enregistrement).', fileHint: 'Change seulement le mode de l’éditeur ; le nom du fichier reste le même.',
			defaultTitle: 'Choisir le langage', searchPlaceholder: 'Rechercher par nom ou extension (json, yml, .tsx, sql…)', searchAria: 'Rechercher un langage',
			detectedBadge: 'Détecté d’après le contenu', current: 'actuel', hasFormatter: 'A un formateur',
			notFoundBefore: 'Aucun résultat pour « {query} ». Utilisez', notFoundAfter: 'ou tapez une autre extension.',
			navigate: 'naviguer', choose: 'choisir', realFormat: '= vrai formateur'
		},
		saveDialog: {
			title: 'Enregistrer le brouillon', fileName: 'Nom du fichier', extHint: 'L’extension vient du langage ({lang}). Vous pouvez la changer librement.',
			folder: 'Dossier', root: '{name} (racine)', nameRequired: 'Donnez un nom au fichier'
		},
		langs: { plaintext: 'Texte brut', jsonc: 'JSON avec commentaires' },
		ws: {
			untitled: 'Sans titre-{n}', draftNotFound: 'Brouillon introuvable', createFailed: 'Échec de la création du fichier', invalidName: 'Nom invalide',
			invalidChars: 'Caractères non autorisés dans le nom', exists: 'Un élément portant ce nom existe déjà', noParent: 'Le dossier « {dir} » n’existe pas',
			diskCreate: 'Impossible de créer sur le disque : {error}', diskDelete: 'Échec de la suppression sur le disque : {error}', saveFailed: 'Impossible d’enregistrer : {error}',
			noLocal: 'Votre navigateur ne permet pas d’ouvrir des dossiers de l’ordinateur (utilisez Chrome/Edge).', openFailed: 'Impossible d’ouvrir le dossier : {error}',
			noIdb: 'IndexedDB indisponible : l’éditeur ne fonctionne que pour cette session.', bigFile: '// Fichier volumineux ({size} Ko) : non chargé dans l’éditeur.'
		},
		seed: {
			dir: 'projet', readme: '# Mon projet\n\nÉcrivez ici. Tout est enregistré dans votre navigateur (IndexedDB).\n',
			notesName: 'notes.txt', notes: 'Idées, snippets et brouillons.\n'
		}
	}
});
