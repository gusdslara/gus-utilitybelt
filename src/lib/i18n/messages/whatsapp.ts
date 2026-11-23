import { ns } from './ns.ts';

// App WhatsApp: assinatura do webhook (HMAC) e WAMID.
export default ns({
	pt: {
		hmac: {
			sign: 'Gerar', verify: 'Validar',
			secret: 'App Secret', secretHint: 'Painel da Meta → App → Configurações → Básico → Chave secreta do app.',
			secretPlaceholder: 'chave secreta do app',
			body: 'Corpo bruto da requisição (raw body)', bodyHint: 'Use os bytes exatamente como chegaram. Reformatar o JSON ou trocar \\u00e1 por á muda a assinatura.',
			sample: 'Usar payload de exemplo',
			header: 'Header X-Hub-Signature-256 recebido', headerPlaceholder: 'sha256=…',
			output: 'Header para enviar', copyHeader: 'Copiar header',
			valid: 'Assinatura válida: o webhook veio da Meta e o corpo não foi alterado.',
			invalid: 'Assinatura inválida.', expected: 'Esperado: {value}',
			invalidHints: 'Causas comuns: App Secret errado (não é o token de acesso), corpo reformatado pelo framework (use o raw body) ou header de outro app.',
			noPrefix: 'O header da Meta começa com "sha256=". Comparei só o hex.',
			testTitle: 'Testar seu endpoint', url: 'URL do webhook', urlPlaceholder: 'https://api.seusite.com/webhook',
			curlHint: 'Envia o corpo com a assinatura correta, como a Meta faria.', copyCurl: 'Copiar cURL',
			needSecret: 'Informe o App Secret.'
		},
		wamid: {
			decode: 'Decodificar', encode: 'Gerar',
			input: 'WAMIDs', inputHint: 'Um por linha, ou cole o JSON inteiro do webhook: todos os wamid.… são encontrados.',
			found: '{count} encontrado(s)', none: 'Nenhum WAMID encontrado.',
			phone: 'Número (wa_id)', direction: 'Direção', outbound: 'Enviada pelo seu número (business)', inbound: 'Recebida do contato',
			unknown: 'Desconhecida', messageId: 'ID da mensagem', chatType: 'Tipo do chat', chatTypeUser: '{n} (contato)',
			openChat: 'Abrir conversa', copyJson: 'Copiar JSON',
			errors: { not_base64: 'Não é Base64 válido.', not_thrift: 'Base64 válido, mas não é a estrutura de um WAMID.', unexpected_shape: 'Estrutura diferente do esperado (formato novo?).' },
			formatNote: 'O formato do WAMID não é documentado pela Meta: é Base64 de uma estrutura Thrift (número, direção e id gerado pelo app). Use para depurar, não como regra de negócio.',
			genPhone: 'Número com DDI', genDirection: 'Direção', genId: 'ID da mensagem', genIdHint: 'Vazio = aleatório (hex, como os apps geram).',
			genOutput: 'WAMID gerado', genHint: 'Útil para fixtures e testes de webhook. Não corresponde a mensagem real.'
		}
	},
	en: {
		hmac: {
			sign: 'Generate', verify: 'Validate',
			secret: 'App Secret', secretHint: 'Meta dashboard → App → Settings → Basic → App secret.',
			secretPlaceholder: 'app secret',
			body: 'Raw request body', bodyHint: 'Use the bytes exactly as received. Reformatting the JSON or turning \\u00e1 into á changes the signature.',
			sample: 'Use sample payload',
			header: 'Received X-Hub-Signature-256 header', headerPlaceholder: 'sha256=…',
			output: 'Header to send', copyHeader: 'Copy header',
			valid: 'Valid signature: the webhook came from Meta and the body was not changed.',
			invalid: 'Invalid signature.', expected: 'Expected: {value}',
			invalidHints: 'Common causes: wrong App Secret (it is not the access token), body reformatted by your framework (use the raw body) or a header from another app.',
			noPrefix: 'Meta’s header starts with "sha256=". Only the hex was compared.',
			testTitle: 'Test your endpoint', url: 'Webhook URL', urlPlaceholder: 'https://api.yoursite.com/webhook',
			curlHint: 'Sends the body with the correct signature, as Meta would.', copyCurl: 'Copy cURL',
			needSecret: 'Enter the App Secret.'
		},
		wamid: {
			decode: 'Decode', encode: 'Generate',
			input: 'WAMIDs', inputHint: 'One per line, or paste the whole webhook JSON: every wamid.… is found.',
			found: '{count} found', none: 'No WAMID found.',
			phone: 'Number (wa_id)', direction: 'Direction', outbound: 'Sent by your number (business)', inbound: 'Received from the contact',
			unknown: 'Unknown', messageId: 'Message ID', chatType: 'Chat type', chatTypeUser: '{n} (contact)',
			openChat: 'Open chat', copyJson: 'Copy JSON',
			errors: { not_base64: 'Not valid Base64.', not_thrift: 'Valid Base64, but not a WAMID structure.', unexpected_shape: 'Unexpected structure (new format?).' },
			formatNote: 'The WAMID format is not documented by Meta: it is Base64 of a Thrift structure (number, direction and an app-generated id). Use it for debugging, not as business logic.',
			genPhone: 'Number with country code', genDirection: 'Direction', genId: 'Message ID', genIdHint: 'Empty = random (hex, like the apps generate).',
			genOutput: 'Generated WAMID', genHint: 'Useful for fixtures and webhook tests. It does not match a real message.'
		}
	},
	es: {
		hmac: {
			sign: 'Generar', verify: 'Validar',
			secret: 'App Secret', secretHint: 'Panel de Meta → App → Configuración → Básica → Clave secreta de la app.',
			secretPlaceholder: 'clave secreta de la app',
			body: 'Cuerpo bruto de la solicitud (raw body)', bodyHint: 'Usa los bytes exactamente como llegaron. Reformatear el JSON o cambiar \\u00e1 por á altera la firma.',
			sample: 'Usar payload de ejemplo',
			header: 'Header X-Hub-Signature-256 recibido', headerPlaceholder: 'sha256=…',
			output: 'Header a enviar', copyHeader: 'Copiar header',
			valid: 'Firma válida: el webhook vino de Meta y el cuerpo no fue alterado.',
			invalid: 'Firma inválida.', expected: 'Esperado: {value}',
			invalidHints: 'Causas comunes: App Secret incorrecto (no es el token de acceso), cuerpo reformateado por el framework (usa el raw body) o header de otra app.',
			noPrefix: 'El header de Meta empieza con "sha256=". Solo se comparó el hex.',
			testTitle: 'Prueba tu endpoint', url: 'URL del webhook', urlPlaceholder: 'https://api.tusitio.com/webhook',
			curlHint: 'Envía el cuerpo con la firma correcta, como lo haría Meta.', copyCurl: 'Copiar cURL',
			needSecret: 'Ingresa el App Secret.'
		},
		wamid: {
			decode: 'Decodificar', encode: 'Generar',
			input: 'WAMIDs', inputHint: 'Uno por línea, o pega el JSON completo del webhook: se encuentran todos los wamid.…',
			found: '{count} encontrado(s)', none: 'No se encontró ningún WAMID.',
			phone: 'Número (wa_id)', direction: 'Dirección', outbound: 'Enviado por tu número (business)', inbound: 'Recibido del contacto',
			unknown: 'Desconocida', messageId: 'ID del mensaje', chatType: 'Tipo de chat', chatTypeUser: '{n} (contacto)',
			openChat: 'Abrir chat', copyJson: 'Copiar JSON',
			errors: { not_base64: 'No es Base64 válido.', not_thrift: 'Base64 válido, pero no es la estructura de un WAMID.', unexpected_shape: 'Estructura inesperada (¿formato nuevo?).' },
			formatNote: 'El formato del WAMID no está documentado por Meta: es Base64 de una estructura Thrift (número, dirección e id generado por la app). Úsalo para depurar, no como regla de negocio.',
			genPhone: 'Número con código de país', genDirection: 'Dirección', genId: 'ID del mensaje', genIdHint: 'Vacío = aleatorio (hex, como lo generan las apps).',
			genOutput: 'WAMID generado', genHint: 'Útil para fixtures y pruebas de webhook. No corresponde a un mensaje real.'
		}
	},
	fr: {
		hmac: {
			sign: 'Générer', verify: 'Valider',
			secret: 'App Secret', secretHint: 'Tableau de bord Meta → App → Paramètres → Général → Clé secrète de l’app.',
			secretPlaceholder: 'clé secrète de l’app',
			body: 'Corps brut de la requête (raw body)', bodyHint: 'Utilisez les octets exactement tels que reçus. Reformater le JSON ou remplacer \\u00e1 par á change la signature.',
			sample: 'Utiliser un payload d’exemple',
			header: 'En-tête X-Hub-Signature-256 reçu', headerPlaceholder: 'sha256=…',
			output: 'En-tête à envoyer', copyHeader: 'Copier l’en-tête',
			valid: 'Signature valide : le webhook vient de Meta et le corps n’a pas été modifié.',
			invalid: 'Signature invalide.', expected: 'Attendu : {value}',
			invalidHints: 'Causes fréquentes : mauvais App Secret (ce n’est pas le jeton d’accès), corps reformaté par le framework (utilisez le raw body) ou en-tête d’une autre app.',
			noPrefix: 'L’en-tête de Meta commence par « sha256= ». Seul l’hexadécimal a été comparé.',
			testTitle: 'Tester votre endpoint', url: 'URL du webhook', urlPlaceholder: 'https://api.votresite.com/webhook',
			curlHint: 'Envoie le corps avec la bonne signature, comme le ferait Meta.', copyCurl: 'Copier cURL',
			needSecret: 'Renseignez l’App Secret.'
		},
		wamid: {
			decode: 'Décoder', encode: 'Générer',
			input: 'WAMID', inputHint: 'Un par ligne, ou collez tout le JSON du webhook : tous les wamid.… sont trouvés.',
			found: '{count} trouvé(s)', none: 'Aucun WAMID trouvé.',
			phone: 'Numéro (wa_id)', direction: 'Direction', outbound: 'Envoyé par votre numéro (business)', inbound: 'Reçu du contact',
			unknown: 'Inconnue', messageId: 'ID du message', chatType: 'Type de discussion', chatTypeUser: '{n} (contact)',
			openChat: 'Ouvrir la discussion', copyJson: 'Copier le JSON',
			errors: { not_base64: 'Base64 invalide.', not_thrift: 'Base64 valide, mais pas une structure de WAMID.', unexpected_shape: 'Structure inattendue (nouveau format ?).' },
			formatNote: 'Le format du WAMID n’est pas documenté par Meta : c’est du Base64 d’une structure Thrift (numéro, direction et id généré par l’app). À utiliser pour le débogage, pas comme règle métier.',
			genPhone: 'Numéro avec indicatif pays', genDirection: 'Direction', genId: 'ID du message', genIdHint: 'Vide = aléatoire (hex, comme les apps le génèrent).',
			genOutput: 'WAMID généré', genHint: 'Utile pour les fixtures et les tests de webhook. Ne correspond à aucun message réel.'
		}
	}
});
