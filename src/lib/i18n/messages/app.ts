import { ns } from './ns.ts';

// Janela, dock, seletor de idioma e nomes/descrições das ferramentas (registry.ts).
export default ns({
	pt: {
		meta: { title: 'Gus Utility Belt · Kit de utilidades para devs', description: 'Kit de utilidades para devs: editor local, imagens em PDF, scanner de documentos, senhas, UUID, QR, código de barras, cron, regex, HMAC, WhatsApp (WAMID, webhook), CPF e CNPJ. Tudo roda no seu navegador.' },
		dock: { label: 'Ferramentas', editor: 'Editor', image: 'Imagem', motion: 'Motion', pdf: 'PDF e Scanner', clipboard: 'Clipboard', clipboardCount: 'Clipboard ({count} itens)', api: 'API e IA', language: 'Idioma: {name}' },
		toolsCount: '{count} ferramentas',
		categories: { seguranca: 'Segurança', dev: 'Dev', conteudo: 'Conteúdo', whatsapp: 'WhatsApp', documentos: 'Documentos' },
		tools: {
			senhas: { title: 'Gerador de senhas', description: 'Senhas fortes com nível de segurança e entropia.' },
			hmac: { title: 'HMAC', description: 'Gerar e validar assinaturas HMAC (SHA-1 a SHA-512).' },
			uuid: { title: 'Gerador UUID', description: 'UUID v4 e v7, em lote, com formatação.' },
			cron: { title: 'Gerador Cron', description: 'Monte expressões cron e veja as próximas execuções.' },
			regex: { title: 'Gerador / testador Regex', description: 'Teste expressões regulares com destaque de grupos.' },
			lorem: { title: 'Lorem Ipsum / Mussum Ipsum', description: 'Texto de exemplo em parágrafos, frases ou palavras.' },
			qr: { title: 'QR Code', description: 'Crie QR Codes em PNG ou SVG.' },
			barcode: { title: 'Código de barras', description: 'CODE128, EAN-13, UPC e outros formatos.' },
			whatsapp: { title: 'Link do WhatsApp', description: 'Gere links wa.me com mensagem pronta.' },
			'wa-hmac': { title: 'Assinatura do webhook (HMAC)', description: 'Gere e valide o X-Hub-Signature-256 da Cloud API da Meta.' },
			wamid: { title: 'Decodificador de WAMID', description: 'Extraia número, direção e id da mensagem de um wamid (e gere WAMIDs de teste).' },
			'cpf-cnpj': { title: 'CPF e CNPJ', description: 'Gere números válidos e valide dígitos verificadores.' }
		}
	},
	en: {
		meta: { title: 'Gus Utility Belt · Developer utility kit', description: 'Developer utility kit: local editor, images to PDF, document scanner, passwords, UUID, QR, barcodes, cron, regex, HMAC, WhatsApp (WAMID, webhook), Brazilian CPF and CNPJ. Everything runs in your browser.' },
		dock: { label: 'Tools', editor: 'Editor', image: 'Image', motion: 'Motion', pdf: 'PDF & Scanner', clipboard: 'Clipboard', clipboardCount: 'Clipboard ({count} items)', api: 'API & AI', language: 'Language: {name}' },
		toolsCount: '{count} tools',
		categories: { seguranca: 'Security', dev: 'Dev', conteudo: 'Content', whatsapp: 'WhatsApp', documentos: 'Documents' },
		tools: {
			senhas: { title: 'Password generator', description: 'Strong passwords with security level and entropy.' },
			hmac: { title: 'HMAC', description: 'Generate and validate HMAC signatures (SHA-1 to SHA-512).' },
			uuid: { title: 'UUID generator', description: 'UUID v4 and v7, in bulk, with formatting.' },
			cron: { title: 'Cron builder', description: 'Build cron expressions and see the next runs.' },
			regex: { title: 'Regex builder / tester', description: 'Test regular expressions with group highlighting.' },
			lorem: { title: 'Lorem Ipsum / Mussum Ipsum', description: 'Placeholder text in paragraphs, sentences or words.' },
			qr: { title: 'QR Code', description: 'Create QR Codes as PNG or SVG.' },
			barcode: { title: 'Barcode', description: 'CODE128, EAN-13, UPC and other formats.' },
			whatsapp: { title: 'WhatsApp link', description: 'Create wa.me links with a ready message.' },
			'wa-hmac': { title: 'Webhook signature (HMAC)', description: 'Generate and validate the Meta Cloud API X-Hub-Signature-256.' },
			wamid: { title: 'WAMID decoder', description: 'Extract number, direction and message id from a wamid (and build test WAMIDs).' },
			'cpf-cnpj': { title: 'CPF and CNPJ', description: 'Generate valid Brazilian tax IDs and check their digits.' }
		}
	},
	es: {
		meta: { title: 'Gus Utility Belt · Kit de utilidades para devs', description: 'Kit de utilidades para devs: editor local, imágenes a PDF, escáner de documentos, contraseñas, UUID, QR, códigos de barras, cron, regex, HMAC, WhatsApp (WAMID, webhook), CPF y CNPJ de Brasil. Todo se ejecuta en tu navegador.' },
		dock: { label: 'Herramientas', editor: 'Editor', image: 'Imagen', motion: 'Motion', pdf: 'PDF y Escáner', clipboard: 'Portapapeles', clipboardCount: 'Portapapeles ({count} elementos)', api: 'API e IA', language: 'Idioma: {name}' },
		toolsCount: '{count} herramientas',
		categories: { seguranca: 'Seguridad', dev: 'Dev', conteudo: 'Contenido', whatsapp: 'WhatsApp', documentos: 'Documentos' },
		tools: {
			senhas: { title: 'Generador de contraseñas', description: 'Contraseñas fuertes con nivel de seguridad y entropía.' },
			hmac: { title: 'HMAC', description: 'Genera y valida firmas HMAC (SHA-1 a SHA-512).' },
			uuid: { title: 'Generador de UUID', description: 'UUID v4 y v7, en lote, con formato.' },
			cron: { title: 'Generador de cron', description: 'Arma expresiones cron y mira las próximas ejecuciones.' },
			regex: { title: 'Generador / probador de regex', description: 'Prueba expresiones regulares con resaltado de grupos.' },
			lorem: { title: 'Lorem Ipsum / Mussum Ipsum', description: 'Texto de ejemplo en párrafos, frases o palabras.' },
			qr: { title: 'Código QR', description: 'Crea códigos QR en PNG o SVG.' },
			barcode: { title: 'Código de barras', description: 'CODE128, EAN-13, UPC y otros formatos.' },
			whatsapp: { title: 'Enlace de WhatsApp', description: 'Crea enlaces wa.me con mensaje listo.' },
			'wa-hmac': { title: 'Firma del webhook (HMAC)', description: 'Genera y valida el X-Hub-Signature-256 de la Cloud API de Meta.' },
			wamid: { title: 'Decodificador de WAMID', description: 'Extrae número, dirección e id del mensaje de un wamid (y genera WAMIDs de prueba).' },
			'cpf-cnpj': { title: 'CPF y CNPJ', description: 'Genera identificaciones fiscales brasileñas válidas y verifica sus dígitos.' }
		}
	},
	fr: {
		meta: { title: 'Gus Utility Belt · Boîte à outils pour devs', description: 'Boîte à outils pour devs : éditeur local, images en PDF, scanner de documents, mots de passe, UUID, QR, codes-barres, cron, regex, HMAC, WhatsApp (WAMID, webhook), CPF et CNPJ brésiliens. Tout s’exécute dans votre navigateur.' },
		dock: { label: 'Outils', editor: 'Éditeur', image: 'Image', motion: 'Motion', pdf: 'PDF et Scanner', clipboard: 'Presse-papiers', clipboardCount: 'Presse-papiers ({count} éléments)', api: 'API et IA', language: 'Langue : {name}' },
		toolsCount: '{count} outils',
		categories: { seguranca: 'Sécurité', dev: 'Dev', conteudo: 'Contenu', whatsapp: 'WhatsApp', documentos: 'Documents' },
		tools: {
			senhas: { title: 'Générateur de mots de passe', description: 'Mots de passe robustes avec niveau de sécurité et entropie.' },
			hmac: { title: 'HMAC', description: 'Générer et valider des signatures HMAC (SHA-1 à SHA-512).' },
			uuid: { title: 'Générateur d’UUID', description: 'UUID v4 et v7, en lot, avec mise en forme.' },
			cron: { title: 'Générateur cron', description: 'Composez des expressions cron et voyez les prochaines exécutions.' },
			regex: { title: 'Générateur / testeur de regex', description: 'Testez des expressions régulières avec mise en évidence des groupes.' },
			lorem: { title: 'Lorem Ipsum / Mussum Ipsum', description: 'Texte factice en paragraphes, phrases ou mots.' },
			qr: { title: 'QR Code', description: 'Créez des QR Codes en PNG ou SVG.' },
			barcode: { title: 'Code-barres', description: 'CODE128, EAN-13, UPC et autres formats.' },
			whatsapp: { title: 'Lien WhatsApp', description: 'Créez des liens wa.me avec un message prêt.' },
			'wa-hmac': { title: 'Signature du webhook (HMAC)', description: 'Générez et validez le X-Hub-Signature-256 de la Cloud API de Meta.' },
			wamid: { title: 'Décodeur de WAMID', description: 'Extrayez numéro, direction et id du message d’un wamid (et générez des WAMID de test).' },
			'cpf-cnpj': { title: 'CPF et CNPJ', description: 'Générez des identifiants fiscaux brésiliens valides et vérifiez leurs chiffres.' }
		}
	}
});
