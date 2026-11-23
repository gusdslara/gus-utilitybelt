import { ns } from './ns.ts';

// Textos das ferramentas (src/lib/components/tools/*.svelte). Uma chave por ferramenta.
export default ns({
	pt: {
		senhas: {
			output: 'Senha gerada', strength: 'Força: {label}', weak: 'Fraca', fair: 'Razoável', strong: 'Forte', veryStrong: 'Muito forte',
			profile: 'Perfil', presetStrong: 'Forte', presetExtreme: 'Extremo', length: 'Tamanho', lengthAria: 'Tamanho da senha',
			lower: 'Minúsculas (a–z)', upper: 'Maiúsculas (A–Z)', digits: 'Números (0–9)', symbols: 'Símbolos (!@#…)',
			noAmbiguous: 'Sem caracteres ambíguos (0 O 1 l I)', noRepeat: 'Sem repetir caracteres', noSet: 'Marque pelo menos um conjunto de caracteres.',
			history: 'Últimas geradas', hintBefore: 'Gerado localmente com', hintAfter: '. Nada é enviado para nenhum servidor.'
		},
		hmac: {
			algorithm: 'Algoritmo', encoding: 'Codificação', key: 'Chave secreta', keyPlaceholder: 'sua chave', message: 'Mensagem', messagePlaceholder: 'texto a assinar',
			expected: 'Assinatura esperada', examplePrefix: 'ex.:', error: 'Erro ao calcular: {msg}', result: 'Resultado ({algo}, {encoding})',
			validSig: 'Assinatura válida', invalidSig: 'Assinatura inválida', hintBefore: 'Usa Web Crypto (', hintAfter: '). A chave nunca sai do navegador.'
		},
		uuid: {
			version: 'Versão', v4: 'v4 · aleatório', v7: 'v7 · ordenado por tempo', noHyphens: 'Sem hífens',
			hint: 'UUID v7 usa timestamp em milissegundos + aleatoriedade, ideal para chaves de banco ordenáveis.'
		},
		cron: {
			presets: { everyMinute: 'A cada minuto', every15: 'A cada 15 min', hourly: 'Toda hora', daily: 'Diariamente 00:00', weekdays: 'Dias úteis 09:00', weekly: 'Semanal (dom 03:00)', monthly: 'Mensal (dia 1, 06:30)' },
			fields: { minute: 'Minuto', hour: 'Hora', dom: 'Dia do mês', month: 'Mês', dow: 'Dia da semana' },
			fieldsAria: 'Campos cron', expression: 'Expressão', timezone: 'Fuso horário (IANA)', fieldCount: 'A expressão precisa ter exatamente 5 campos.',
			next: 'Próximas execuções', copy: 'Copiar expressão',
			hintFields: 'Campos: minuto hora dia-do-mês mês dia-da-semana (0 = domingo). Suporta', hintLists: ', listas', hintRanges: ', intervalos', hintSteps: 'e passos'
		},
		regex: {
			sampleText: 'Lançado em 2026-11-22 e revisado em 2025-03-01.\nOutro evento: 1999-12-31.',
			templates: 'Modelos:', email: 'E-mail', isoDate: 'Data ISO', hexColor: 'Hex color',
			flags: { g: 'global', i: 'ignorar caixa', m: 'multilinha', s: 'dotAll', u: 'unicode' },
			pattern: 'Expressão regular', matches: '{count} correspondência(s)', testText: 'Texto de teste', highlight: 'Destaque',
			groups: 'Grupos capturados', replacement: 'Substituição (use $1, $<nome>)', copy: 'Copiar /regex/'
		},
		lorem: {
			unit: 'Unidade', size: 'Tamanho', custom: 'Personalizado',
			units: { paragraphs: 'parágrafos', sentences: 'frases', words: 'palavras' },
			stats: '{words} palavras · {chars} caracteres'
		},
		qr: {
			content: 'Conteúdo (texto ou URL)', size: 'Tamanho (px)', ecl: 'Correção de erro', color: 'Cor', colorAria: 'Cor dos módulos',
			background: 'Fundo', backgroundAria: 'Cor de fundo', error: 'Não foi possível gerar: {msg}', copyText: 'Copiar texto',
			preview: 'Pré-visualização do QR Code', alt: 'QR Code gerado', empty: 'Digite algo para gerar.'
		},
		barcode: {
			format: 'Formato',
			hints: {
				CODE128: 'Texto livre (ASCII)', CODE39: 'Letras maiúsculas, números e - . $ / + % espaço', EAN13: '12 dígitos (o 13º é calculado)',
				EAN8: '7 dígitos (o 8º é calculado)', UPC: '11 dígitos (o 12º é calculado)', ITF14: '13 dígitos (o 14º é calculado)',
				MSI: 'Somente dígitos', pharmacode: 'Número entre 3 e 131070'
			},
			value: 'Valor', width: 'Largura', height: 'Altura', showText: 'Mostrar texto', download: 'Baixar SVG', copy: 'Copiar SVG'
		},
		whatsappLink: {
			defaultMessage: 'Olá! Vim pelo site.', phone: 'Número com DDI e DDD', phoneHint: 'Exemplo: 5511999998888. Só dígitos são usados.',
			message: 'Mensagem pré-preenchida (opcional)', phoneError: 'Informe o número com DDD (10 a 15 dígitos, ex.: 5511999998888).',
			link: 'Link', copy: 'Copiar link'
		},
		cpfCnpj: {
			document: 'Documento', masked: 'Com pontuação', alnum: 'CNPJ alfanumérico (novo formato)',
			genHint: 'Números gerados com dígitos verificadores válidos. Use somente para testes: são fictícios e não pertencem a ninguém.',
			cpfInput: 'CPF (com ou sem pontuação)', cnpjInput: 'CNPJ (numérico ou alfanumérico)',
			valid: 'Documento válido', invalid: 'Documento inválido', expectedDv: 'Dígito verificador esperado para essa base:'
		}
	},
	en: {
		senhas: {
			output: 'Generated password', strength: 'Strength: {label}', weak: 'Weak', fair: 'Fair', strong: 'Strong', veryStrong: 'Very strong',
			profile: 'Profile', presetStrong: 'Strong', presetExtreme: 'Extreme', length: 'Length', lengthAria: 'Password length',
			lower: 'Lowercase (a–z)', upper: 'Uppercase (A–Z)', digits: 'Numbers (0–9)', symbols: 'Symbols (!@#…)',
			noAmbiguous: 'No ambiguous characters (0 O 1 l I)', noRepeat: 'No repeated characters', noSet: 'Select at least one character set.',
			history: 'Recently generated', hintBefore: 'Generated locally with', hintAfter: '. Nothing is sent to any server.'
		},
		hmac: {
			algorithm: 'Algorithm', encoding: 'Encoding', key: 'Secret key', keyPlaceholder: 'your key', message: 'Message', messagePlaceholder: 'text to sign',
			expected: 'Expected signature', examplePrefix: 'e.g.', error: 'Calculation error: {msg}', result: 'Result ({algo}, {encoding})',
			validSig: 'Valid signature', invalidSig: 'Invalid signature', hintBefore: 'Uses Web Crypto (', hintAfter: '). The key never leaves your browser.'
		},
		uuid: {
			version: 'Version', v4: 'v4 · random', v7: 'v7 · time-ordered', noHyphens: 'No hyphens',
			hint: 'UUID v7 uses a millisecond timestamp plus randomness, ideal for sortable database keys.'
		},
		cron: {
			presets: { everyMinute: 'Every minute', every15: 'Every 15 min', hourly: 'Every hour', daily: 'Daily 00:00', weekdays: 'Weekdays 09:00', weekly: 'Weekly (Sun 03:00)', monthly: 'Monthly (day 1, 06:30)' },
			fields: { minute: 'Minute', hour: 'Hour', dom: 'Day of month', month: 'Month', dow: 'Day of week' },
			fieldsAria: 'Cron fields', expression: 'Expression', timezone: 'Time zone (IANA)', fieldCount: 'The expression must have exactly 5 fields.',
			next: 'Next runs', copy: 'Copy expression',
			hintFields: 'Fields: minute hour day-of-month month day-of-week (0 = Sunday). Supports', hintLists: ', lists', hintRanges: ', ranges', hintSteps: 'and steps'
		},
		regex: {
			sampleText: 'Released on 2026-11-22 and revised on 2025-03-01.\nAnother event: 1999-12-31.',
			templates: 'Templates:', email: 'Email', isoDate: 'ISO date', hexColor: 'Hex color',
			flags: { g: 'global', i: 'ignore case', m: 'multiline', s: 'dotAll', u: 'unicode' },
			pattern: 'Regular expression', matches: '{count} match(es)', testText: 'Test text', highlight: 'Highlight',
			groups: 'Captured groups', replacement: 'Replacement (use $1, $<name>)', copy: 'Copy /regex/'
		},
		lorem: {
			unit: 'Unit', size: 'Size', custom: 'Custom',
			units: { paragraphs: 'paragraphs', sentences: 'sentences', words: 'words' },
			stats: '{words} words · {chars} characters'
		},
		qr: {
			content: 'Content (text or URL)', size: 'Size (px)', ecl: 'Error correction', color: 'Color', colorAria: 'Module color',
			background: 'Background', backgroundAria: 'Background color', error: 'Could not generate: {msg}', copyText: 'Copy text',
			preview: 'QR Code preview', alt: 'Generated QR Code', empty: 'Type something to generate.'
		},
		barcode: {
			format: 'Format',
			hints: {
				CODE128: 'Free text (ASCII)', CODE39: 'Uppercase letters, digits and - . $ / + % space', EAN13: '12 digits (the 13th is calculated)',
				EAN8: '7 digits (the 8th is calculated)', UPC: '11 digits (the 12th is calculated)', ITF14: '13 digits (the 14th is calculated)',
				MSI: 'Digits only', pharmacode: 'Number between 3 and 131070'
			},
			value: 'Value', width: 'Width', height: 'Height', showText: 'Show text', download: 'Download SVG', copy: 'Copy SVG'
		},
		whatsappLink: {
			defaultMessage: 'Hi! I found you through the website.', phone: 'Number with country and area code', phoneHint: 'Example: 5511999998888. Only digits are used.',
			message: 'Prefilled message (optional)', phoneError: 'Enter the number with area code (10 to 15 digits, e.g. 5511999998888).',
			link: 'Link', copy: 'Copy link'
		},
		cpfCnpj: {
			document: 'Document', masked: 'With punctuation', alnum: 'Alphanumeric CNPJ (new format)',
			genHint: 'Brazilian individual (CPF) and company (CNPJ) tax IDs with valid check digits. For testing only: they are fictitious and belong to no one.',
			cpfInput: 'CPF (with or without punctuation)', cnpjInput: 'CNPJ (numeric or alphanumeric)',
			valid: 'Valid document', invalid: 'Invalid document', expectedDv: 'Expected check digits for this base:'
		}
	},
	es: {
		senhas: {
			output: 'Contraseña generada', strength: 'Fuerza: {label}', weak: 'Débil', fair: 'Aceptable', strong: 'Fuerte', veryStrong: 'Muy fuerte',
			profile: 'Perfil', presetStrong: 'Fuerte', presetExtreme: 'Extremo', length: 'Longitud', lengthAria: 'Longitud de la contraseña',
			lower: 'Minúsculas (a–z)', upper: 'Mayúsculas (A–Z)', digits: 'Números (0–9)', symbols: 'Símbolos (!@#…)',
			noAmbiguous: 'Sin caracteres ambiguos (0 O 1 l I)', noRepeat: 'Sin repetir caracteres', noSet: 'Marca al menos un conjunto de caracteres.',
			history: 'Últimas generadas', hintBefore: 'Generada localmente con', hintAfter: '. No se envía nada a ningún servidor.'
		},
		hmac: {
			algorithm: 'Algoritmo', encoding: 'Codificación', key: 'Clave secreta', keyPlaceholder: 'tu clave', message: 'Mensaje', messagePlaceholder: 'texto a firmar',
			expected: 'Firma esperada', examplePrefix: 'ej.:', error: 'Error al calcular: {msg}', result: 'Resultado ({algo}, {encoding})',
			validSig: 'Firma válida', invalidSig: 'Firma inválida', hintBefore: 'Usa Web Crypto (', hintAfter: '). La clave nunca sale del navegador.'
		},
		uuid: {
			version: 'Versión', v4: 'v4 · aleatorio', v7: 'v7 · ordenado por tiempo', noHyphens: 'Sin guiones',
			hint: 'UUID v7 usa un timestamp en milisegundos + aleatoriedad, ideal para claves de base de datos ordenables.'
		},
		cron: {
			presets: { everyMinute: 'Cada minuto', every15: 'Cada 15 min', hourly: 'Cada hora', daily: 'Diario 00:00', weekdays: 'Días hábiles 09:00', weekly: 'Semanal (dom 03:00)', monthly: 'Mensual (día 1, 06:30)' },
			fields: { minute: 'Minuto', hour: 'Hora', dom: 'Día del mes', month: 'Mes', dow: 'Día de la semana' },
			fieldsAria: 'Campos cron', expression: 'Expresión', timezone: 'Zona horaria (IANA)', fieldCount: 'La expresión debe tener exactamente 5 campos.',
			next: 'Próximas ejecuciones', copy: 'Copiar expresión',
			hintFields: 'Campos: minuto hora día-del-mes mes día-de-la-semana (0 = domingo). Admite', hintLists: ', listas', hintRanges: ', rangos', hintSteps: 'y pasos'
		},
		regex: {
			sampleText: 'Lanzado el 2026-11-22 y revisado el 2025-03-01.\nOtro evento: 1999-12-31.',
			templates: 'Plantillas:', email: 'Correo', isoDate: 'Fecha ISO', hexColor: 'Color hex',
			flags: { g: 'global', i: 'ignorar mayúsculas', m: 'multilínea', s: 'dotAll', u: 'unicode' },
			pattern: 'Expresión regular', matches: '{count} coincidencia(s)', testText: 'Texto de prueba', highlight: 'Resaltado',
			groups: 'Grupos capturados', replacement: 'Reemplazo (usa $1, $<nombre>)', copy: 'Copiar /regex/'
		},
		lorem: {
			unit: 'Unidad', size: 'Tamaño', custom: 'Personalizado',
			units: { paragraphs: 'párrafos', sentences: 'frases', words: 'palabras' },
			stats: '{words} palabras · {chars} caracteres'
		},
		qr: {
			content: 'Contenido (texto o URL)', size: 'Tamaño (px)', ecl: 'Corrección de errores', color: 'Color', colorAria: 'Color de los módulos',
			background: 'Fondo', backgroundAria: 'Color de fondo', error: 'No se pudo generar: {msg}', copyText: 'Copiar texto',
			preview: 'Vista previa del código QR', alt: 'Código QR generado', empty: 'Escribe algo para generar.'
		},
		barcode: {
			format: 'Formato',
			hints: {
				CODE128: 'Texto libre (ASCII)', CODE39: 'Letras mayúsculas, números y - . $ / + % espacio', EAN13: '12 dígitos (el 13.º se calcula)',
				EAN8: '7 dígitos (el 8.º se calcula)', UPC: '11 dígitos (el 12.º se calcula)', ITF14: '13 dígitos (el 14.º se calcula)',
				MSI: 'Solo dígitos', pharmacode: 'Número entre 3 y 131070'
			},
			value: 'Valor', width: 'Ancho', height: 'Alto', showText: 'Mostrar texto', download: 'Descargar SVG', copy: 'Copiar SVG'
		},
		whatsappLink: {
			defaultMessage: '¡Hola! Vengo del sitio web.', phone: 'Número con código de país y de área', phoneHint: 'Ejemplo: 5511999998888. Solo se usan los dígitos.',
			message: 'Mensaje predefinido (opcional)', phoneError: 'Indica el número con código de área (10 a 15 dígitos, ej.: 5511999998888).',
			link: 'Enlace', copy: 'Copiar enlace'
		},
		cpfCnpj: {
			document: 'Documento', masked: 'Con puntuación', alnum: 'CNPJ alfanumérico (nuevo formato)',
			genHint: 'Números de identificación fiscal brasileños (CPF de personas, CNPJ de empresas) con dígitos verificadores válidos. Úsalos solo para pruebas: son ficticios y no pertenecen a nadie.',
			cpfInput: 'CPF (con o sin puntuación)', cnpjInput: 'CNPJ (numérico o alfanumérico)',
			valid: 'Documento válido', invalid: 'Documento inválido', expectedDv: 'Dígito verificador esperado para esta base:'
		}
	},
	fr: {
		senhas: {
			output: 'Mot de passe généré', strength: 'Robustesse : {label}', weak: 'Faible', fair: 'Correct', strong: 'Fort', veryStrong: 'Très fort',
			profile: 'Profil', presetStrong: 'Fort', presetExtreme: 'Extrême', length: 'Longueur', lengthAria: 'Longueur du mot de passe',
			lower: 'Minuscules (a–z)', upper: 'Majuscules (A–Z)', digits: 'Chiffres (0–9)', symbols: 'Symboles (!@#…)',
			noAmbiguous: 'Sans caractères ambigus (0 O 1 l I)', noRepeat: 'Sans caractères répétés', noSet: 'Cochez au moins un jeu de caractères.',
			history: 'Derniers générés', hintBefore: 'Généré localement avec', hintAfter: '. Rien n’est envoyé à un serveur.'
		},
		hmac: {
			algorithm: 'Algorithme', encoding: 'Encodage', key: 'Clé secrète', keyPlaceholder: 'votre clé', message: 'Message', messagePlaceholder: 'texte à signer',
			expected: 'Signature attendue', examplePrefix: 'ex. :', error: 'Erreur de calcul : {msg}', result: 'Résultat ({algo}, {encoding})',
			validSig: 'Signature valide', invalidSig: 'Signature invalide', hintBefore: 'Utilise Web Crypto (', hintAfter: '). La clé ne quitte jamais le navigateur.'
		},
		uuid: {
			version: 'Version', v4: 'v4 · aléatoire', v7: 'v7 · ordonné dans le temps', noHyphens: 'Sans tirets',
			hint: 'UUID v7 utilise un timestamp en millisecondes + de l’aléatoire, idéal pour des clés de base de données triables.'
		},
		cron: {
			presets: { everyMinute: 'Chaque minute', every15: 'Toutes les 15 min', hourly: 'Toutes les heures', daily: 'Tous les jours 00:00', weekdays: 'Jours ouvrés 09:00', weekly: 'Hebdo (dim 03:00)', monthly: 'Mensuel (le 1er, 06:30)' },
			fields: { minute: 'Minute', hour: 'Heure', dom: 'Jour du mois', month: 'Mois', dow: 'Jour de la semaine' },
			fieldsAria: 'Champs cron', expression: 'Expression', timezone: 'Fuseau horaire (IANA)', fieldCount: 'L’expression doit comporter exactement 5 champs.',
			next: 'Prochaines exécutions', copy: 'Copier l’expression',
			hintFields: 'Champs : minute heure jour-du-mois mois jour-de-la-semaine (0 = dimanche). Prend en charge', hintLists: ', les listes', hintRanges: ', les plages', hintSteps: 'et les pas'
		},
		regex: {
			sampleText: 'Publié le 2026-11-22 et révisé le 2025-03-01.\nAutre événement : 1999-12-31.',
			templates: 'Modèles :', email: 'E-mail', isoDate: 'Date ISO', hexColor: 'Couleur hex',
			flags: { g: 'global', i: 'ignorer la casse', m: 'multiligne', s: 'dotAll', u: 'unicode' },
			pattern: 'Expression régulière', matches: '{count} correspondance(s)', testText: 'Texte de test', highlight: 'Surlignage',
			groups: 'Groupes capturés', replacement: 'Remplacement (utilisez $1, $<nom>)', copy: 'Copier /regex/'
		},
		lorem: {
			unit: 'Unité', size: 'Taille', custom: 'Personnalisé',
			units: { paragraphs: 'paragraphes', sentences: 'phrases', words: 'mots' },
			stats: '{words} mots · {chars} caractères'
		},
		qr: {
			content: 'Contenu (texte ou URL)', size: 'Taille (px)', ecl: 'Correction d’erreur', color: 'Couleur', colorAria: 'Couleur des modules',
			background: 'Fond', backgroundAria: 'Couleur de fond', error: 'Impossible de générer : {msg}', copyText: 'Copier le texte',
			preview: 'Aperçu du QR Code', alt: 'QR Code généré', empty: 'Saisissez quelque chose pour générer.'
		},
		barcode: {
			format: 'Format',
			hints: {
				CODE128: 'Texte libre (ASCII)', CODE39: 'Majuscules, chiffres et - . $ / + % espace', EAN13: '12 chiffres (le 13e est calculé)',
				EAN8: '7 chiffres (le 8e est calculé)', UPC: '11 chiffres (le 12e est calculé)', ITF14: '13 chiffres (le 14e est calculé)',
				MSI: 'Chiffres uniquement', pharmacode: 'Nombre entre 3 et 131070'
			},
			value: 'Valeur', width: 'Largeur', height: 'Hauteur', showText: 'Afficher le texte', download: 'Télécharger le SVG', copy: 'Copier le SVG'
		},
		whatsappLink: {
			defaultMessage: 'Bonjour ! Je viens du site.', phone: 'Numéro avec indicatif pays et régional', phoneHint: 'Exemple : 5511999998888. Seuls les chiffres sont utilisés.',
			message: 'Message prérempli (facultatif)', phoneError: 'Saisissez le numéro avec l’indicatif régional (10 à 15 chiffres, ex. : 5511999998888).',
			link: 'Lien', copy: 'Copier le lien'
		},
		cpfCnpj: {
			document: 'Document', masked: 'Avec ponctuation', alnum: 'CNPJ alphanumérique (nouveau format)',
			genHint: 'Identifiants fiscaux brésiliens (CPF pour les personnes, CNPJ pour les entreprises) avec chiffres de contrôle valides. Pour les tests uniquement : ils sont fictifs et n’appartiennent à personne.',
			cpfInput: 'CPF (avec ou sans ponctuation)', cnpjInput: 'CNPJ (numérique ou alphanumérique)',
			valid: 'Document valide', invalid: 'Document invalide', expectedDv: 'Chiffres de contrôle attendus pour cette base :'
		}
	}
});
