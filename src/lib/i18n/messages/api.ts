import { ns } from './ns.ts';

// Console "API e IA" e página /run. Nomes técnicos e descrições das ações (contrato para IAs) ficam em inglês.
export default ns({
	pt: {
		intro: 'Todas as ferramentas também funcionam por API, para devs e IAs:',
		introBrowser: 'Agentes no navegador', introPc: 'IAs no PC', introTerminal: 'Terminal',
		guide: 'Guia', catalog: 'Catálogo',
		actionsList: 'Ações disponíveis', searchPlaceholder: 'Buscar ação…', noResults: 'Nenhuma ação encontrada.',
		readOnly: 'somente leitura', writes: 'altera dados', browserOnly: 'só no navegador',
		descriptionNote: 'Descrição em inglês: é o texto que as IAs leem (MCP, WebMCP, CLI).',
		required: 'obrigatório', noParams: 'Sem parâmetros.', run: 'Executar', fill: 'Preencha: {fields}',
		error: 'Erro ({code})', image: 'Imagem gerada', copyJson: 'Copiar JSON',
		howToCall: 'Como chamar', snippetFormat: 'Formato do exemplo', link: 'Link /run', copyExample: 'Copiar exemplo',
		browserOnlyHint: 'Esta ação controla a tela/editor e só existe no navegador (WebMCP ou window.utilitybelt).',
		automation: 'Modo automação', automationHint: 'Volta a mostrar o menu lateral (atalho: Esc).', automationExit: 'Sair do modo automação',
		runTitle: 'Executar ação', runSubtitle: 'Executar por URL',
		runDescription: 'Execute qualquer ferramenta do Gus Utility Belt por URL: /run?action=nome&parametro=valor. Resultado em JSON no elemento #ub-result. Catálogo em /tools.json, guia em /llms.txt.',
		categories: { seguranca: 'Segurança', dev: 'Dev', conteudo: 'Conteúdo', whatsapp: 'WhatsApp', documentos: 'Documentos (BR)', editor: 'Código e texto', encode: 'Encode / decode', app: 'Controle do app' },
		actions: {
			password_generate: 'Gerar senhas', password_strength: 'Avaliar senha', hmac_sign: 'Gerar HMAC', hmac_verify: 'Validar HMAC', hash_digest: 'Hash (SHA)',
			uuid_generate: 'Gerar UUID', uuid_inspect: 'Inspecionar UUID', cron_explain: 'Explicar cron', regex_test: 'Testar regex', timestamp_convert: 'Converter timestamp',
			language_detect: 'Detectar linguagem', languages_list: 'Listar linguagens', code_format: 'Formatar código', text_diff: 'Comparar textos (diff)',
			base64: 'Base64', url_encode: 'URL encode/decode', jwt_decode: 'Decodificar JWT',
			lorem_generate: 'Lorem / Mussum Ipsum', qr_generate: 'Gerar QR Code', barcode_generate: 'Gerar código de barras',
			whatsapp_link: 'Link do WhatsApp', whatsapp_webhook_sign: 'Assinar webhook do WhatsApp', whatsapp_webhook_verify: 'Validar webhook do WhatsApp', wamid_decode: 'Decodificar WAMID', wamid_encode: 'Gerar WAMID',
			cpf_generate: 'Gerar CPF', cpf_validate: 'Validar CPF', cnpj_generate: 'Gerar CNPJ', cnpj_validate: 'Validar CNPJ',
			app_open: 'Abrir app/ferramenta', app_state: 'Estado do app', editor_list_files: 'Listar arquivos do editor', editor_read_file: 'Ler arquivo do editor',
			editor_write_file: 'Escrever arquivo no editor', editor_new_draft: 'Novo rascunho no editor', clipboard_history: 'Histórico do clipboard', clipboard_copy: 'Copiar para o clipboard'
		}
	},
	en: {
		intro: 'Every tool also works through an API, for developers and AIs:',
		introBrowser: 'Browser agents', introPc: 'AI on your PC', introTerminal: 'Terminal',
		guide: 'Guide', catalog: 'Catalog',
		actionsList: 'Available actions', searchPlaceholder: 'Search actions…', noResults: 'No actions found.',
		readOnly: 'read-only', writes: 'modifies data', browserOnly: 'browser only',
		descriptionNote: '',
		required: 'required', noParams: 'No parameters.', run: 'Run', fill: 'Fill in: {fields}',
		error: 'Error ({code})', image: 'Generated image', copyJson: 'Copy JSON',
		howToCall: 'How to call it', snippetFormat: 'Example format', link: '/run link', copyExample: 'Copy example',
		browserOnlyHint: 'This action controls the screen/editor and only exists in the browser (WebMCP or window.utilitybelt).',
		automation: 'Automation mode', automationHint: 'Shows the side menu again (shortcut: Esc).', automationExit: 'Exit automation mode',
		runTitle: 'Run action', runSubtitle: 'Run by URL',
		runDescription: 'Run any Gus Utility Belt tool by URL: /run?action=name&param=value. JSON result in the #ub-result element. Catalog at /tools.json, guide at /llms.txt.',
		categories: { seguranca: 'Security', dev: 'Dev', conteudo: 'Content', whatsapp: 'WhatsApp', documentos: 'Documents (Brazil)', editor: 'Code and text', encode: 'Encode / decode', app: 'App control' },
		actions: {
			password_generate: 'Generate passwords', password_strength: 'Check password strength', hmac_sign: 'Generate HMAC', hmac_verify: 'Validate HMAC', hash_digest: 'Hash (SHA)',
			uuid_generate: 'Generate UUID', uuid_inspect: 'Inspect UUID', cron_explain: 'Explain cron', regex_test: 'Test regex', timestamp_convert: 'Convert timestamp',
			language_detect: 'Detect language', languages_list: 'List languages', code_format: 'Format code', text_diff: 'Compare texts (diff)',
			base64: 'Base64', url_encode: 'URL encode/decode', jwt_decode: 'Decode JWT',
			lorem_generate: 'Lorem / Mussum Ipsum', qr_generate: 'Generate QR Code', barcode_generate: 'Generate barcode',
			whatsapp_link: 'WhatsApp link', whatsapp_webhook_sign: 'Sign WhatsApp webhook', whatsapp_webhook_verify: 'Validate WhatsApp webhook', wamid_decode: 'Decode WAMID', wamid_encode: 'Generate WAMID',
			cpf_generate: 'Generate CPF', cpf_validate: 'Validate CPF', cnpj_generate: 'Generate CNPJ', cnpj_validate: 'Validate CNPJ',
			app_open: 'Open app/tool', app_state: 'App state', editor_list_files: 'List editor files', editor_read_file: 'Read editor file',
			editor_write_file: 'Write editor file', editor_new_draft: 'New editor draft', clipboard_history: 'Clipboard history', clipboard_copy: 'Copy to clipboard'
		}
	},
	es: {
		intro: 'Todas las herramientas también funcionan por API, para devs e IAs:',
		introBrowser: 'Agentes en el navegador', introPc: 'IA en tu PC', introTerminal: 'Terminal',
		guide: 'Guía', catalog: 'Catálogo',
		actionsList: 'Acciones disponibles', searchPlaceholder: 'Buscar acción…', noResults: 'No se encontraron acciones.',
		readOnly: 'solo lectura', writes: 'modifica datos', browserOnly: 'solo en el navegador',
		descriptionNote: 'Descripción en inglés: es el texto que leen las IAs (MCP, WebMCP, CLI).',
		required: 'obligatorio', noParams: 'Sin parámetros.', run: 'Ejecutar', fill: 'Completa: {fields}',
		error: 'Error ({code})', image: 'Imagen generada', copyJson: 'Copiar JSON',
		howToCall: 'Cómo llamarla', snippetFormat: 'Formato del ejemplo', link: 'Enlace /run', copyExample: 'Copiar ejemplo',
		browserOnlyHint: 'Esta acción controla la pantalla/editor y solo existe en el navegador (WebMCP o window.utilitybelt).',
		automation: 'Modo automatización', automationHint: 'Vuelve a mostrar el menú lateral (atajo: Esc).', automationExit: 'Salir del modo automatización',
		runTitle: 'Ejecutar acción', runSubtitle: 'Ejecutar por URL',
		runDescription: 'Ejecuta cualquier herramienta de Gus Utility Belt por URL: /run?action=nombre&parametro=valor. Resultado en JSON en el elemento #ub-result. Catálogo en /tools.json, guía en /llms.txt.',
		categories: { seguranca: 'Seguridad', dev: 'Dev', conteudo: 'Contenido', whatsapp: 'WhatsApp', documentos: 'Documentos (Brasil)', editor: 'Código y texto', encode: 'Encode / decode', app: 'Control de la app' },
		actions: {
			password_generate: 'Generar contraseñas', password_strength: 'Evaluar contraseña', hmac_sign: 'Generar HMAC', hmac_verify: 'Validar HMAC', hash_digest: 'Hash (SHA)',
			uuid_generate: 'Generar UUID', uuid_inspect: 'Inspeccionar UUID', cron_explain: 'Explicar cron', regex_test: 'Probar regex', timestamp_convert: 'Convertir timestamp',
			language_detect: 'Detectar lenguaje', languages_list: 'Listar lenguajes', code_format: 'Formatear código', text_diff: 'Comparar textos (diff)',
			base64: 'Base64', url_encode: 'URL encode/decode', jwt_decode: 'Decodificar JWT',
			lorem_generate: 'Lorem / Mussum Ipsum', qr_generate: 'Generar código QR', barcode_generate: 'Generar código de barras',
			whatsapp_link: 'Enlace de WhatsApp', whatsapp_webhook_sign: 'Firmar webhook de WhatsApp', whatsapp_webhook_verify: 'Validar webhook de WhatsApp', wamid_decode: 'Decodificar WAMID', wamid_encode: 'Generar WAMID',
			cpf_generate: 'Generar CPF', cpf_validate: 'Validar CPF', cnpj_generate: 'Generar CNPJ', cnpj_validate: 'Validar CNPJ',
			app_open: 'Abrir app/herramienta', app_state: 'Estado de la app', editor_list_files: 'Listar archivos del editor', editor_read_file: 'Leer archivo del editor',
			editor_write_file: 'Escribir archivo en el editor', editor_new_draft: 'Nuevo borrador en el editor', clipboard_history: 'Historial del portapapeles', clipboard_copy: 'Copiar al portapapeles'
		}
	},
	fr: {
		intro: 'Chaque outil fonctionne aussi via une API, pour les devs et les IA :',
		introBrowser: 'Agents dans le navigateur', introPc: 'IA sur votre PC', introTerminal: 'Terminal',
		guide: 'Guide', catalog: 'Catalogue',
		actionsList: 'Actions disponibles', searchPlaceholder: 'Rechercher une action…', noResults: 'Aucune action trouvée.',
		readOnly: 'lecture seule', writes: 'modifie des données', browserOnly: 'navigateur uniquement',
		descriptionNote: 'Description en anglais : c’est le texte que lisent les IA (MCP, WebMCP, CLI).',
		required: 'obligatoire', noParams: 'Aucun paramètre.', run: 'Exécuter', fill: 'À renseigner : {fields}',
		error: 'Erreur ({code})', image: 'Image générée', copyJson: 'Copier le JSON',
		howToCall: 'Comment l’appeler', snippetFormat: 'Format de l’exemple', link: 'Lien /run', copyExample: 'Copier l’exemple',
		browserOnlyHint: 'Cette action contrôle l’écran/l’éditeur et n’existe que dans le navigateur (WebMCP ou window.utilitybelt).',
		automation: 'Mode automatisation', automationHint: 'Réaffiche le menu latéral (raccourci : Échap).', automationExit: 'Quitter le mode automatisation',
		runTitle: 'Exécuter une action', runSubtitle: 'Exécuter par URL',
		runDescription: 'Exécutez n’importe quel outil de Gus Utility Belt par URL : /run?action=nom&parametre=valeur. Résultat JSON dans l’élément #ub-result. Catalogue sur /tools.json, guide sur /llms.txt.',
		categories: { seguranca: 'Sécurité', dev: 'Dev', conteudo: 'Contenu', whatsapp: 'WhatsApp', documentos: 'Documents (Brésil)', editor: 'Code et texte', encode: 'Encode / decode', app: 'Contrôle de l’app' },
		actions: {
			password_generate: 'Générer des mots de passe', password_strength: 'Évaluer un mot de passe', hmac_sign: 'Générer un HMAC', hmac_verify: 'Valider un HMAC', hash_digest: 'Hash (SHA)',
			uuid_generate: 'Générer des UUID', uuid_inspect: 'Inspecter un UUID', cron_explain: 'Expliquer un cron', regex_test: 'Tester une regex', timestamp_convert: 'Convertir un timestamp',
			language_detect: 'Détecter le langage', languages_list: 'Lister les langages', code_format: 'Formater du code', text_diff: 'Comparer des textes (diff)',
			base64: 'Base64', url_encode: 'URL encode/decode', jwt_decode: 'Décoder un JWT',
			lorem_generate: 'Lorem / Mussum Ipsum', qr_generate: 'Générer un QR Code', barcode_generate: 'Générer un code-barres',
			whatsapp_link: 'Lien WhatsApp', whatsapp_webhook_sign: 'Signer un webhook WhatsApp', whatsapp_webhook_verify: 'Valider un webhook WhatsApp', wamid_decode: 'Décoder un WAMID', wamid_encode: 'Générer un WAMID',
			cpf_generate: 'Générer un CPF', cpf_validate: 'Valider un CPF', cnpj_generate: 'Générer un CNPJ', cnpj_validate: 'Valider un CNPJ',
			app_open: 'Ouvrir une app/un outil', app_state: 'État de l’app', editor_list_files: 'Lister les fichiers de l’éditeur', editor_read_file: 'Lire un fichier de l’éditeur',
			editor_write_file: 'Écrire un fichier dans l’éditeur', editor_new_draft: 'Nouveau brouillon dans l’éditeur', clipboard_history: 'Historique du presse-papiers', clipboard_copy: 'Copier dans le presse-papiers'
		}
	}
});
