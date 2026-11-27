import { ns } from './ns.ts';

// App PDF: imagens → PDF e scanner de documentos pela câmera.
export default ns({
	pt: {
		title: 'PDF e Scanner',
		pagesCount: '{count} páginas',
		actions: {
			scan: 'Escanear', add: 'Adicionar imagens', clear: 'Limpar tudo', sortName: 'Ordenar por nome', reverse: 'Inverter ordem',
			filterAll: 'Filtro em todas', autoCropAll: 'Recortar documentos detectados', more: 'Mais ações'
		},
		empty: {
			title: 'Imagens em PDF, ou escaneie documentos com a câmera',
			body: 'Arraste imagens, cole (Ctrl+V) ou fotografe. Recorte automático com correção de perspectiva, remoção de sombras e filtros. Tudo roda no seu aparelho: nada é enviado.',
			formats: 'JPG, PNG, WebP, HEIC (iPhone), AVIF, GIF, BMP e SVG'
		},
		drop: 'Solte para adicionar as imagens',
		importing: 'Lendo {count} imagens…',
		importErrors: 'Não foi possível abrir:',
		dismiss: 'Dispensar',
		page: {
			label: 'Página {n}', edit: 'Editar recorte e filtro', rotateL: 'Girar à esquerda', rotateR: 'Girar à direita', duplicate: 'Duplicar',
			remove: 'Remover', drag: 'Arrastar para reordenar (setas do teclado também movem)', processing: 'Processando…', error: 'Falha ao processar', cropped: 'Recortada'
		},
		filters: { original: 'Original', enhance: 'Realçado', gray: 'Cinza', bw: 'P&B' },
		filterHints: {
			original: 'A foto como está.',
			enhance: 'Papel branco, sem sombras, cores vivas. O melhor para a maioria dos documentos.',
			gray: 'Tons de cinza limpos e nítidos.',
			bw: 'Preto e branco puro: texto nítido e PDF bem pequeno (1 bit).'
		},
		settings: {
			title: 'Ajustes do PDF', size: 'Tamanho da página', orientation: 'Orientação', fit: 'Encaixe', margin: 'Margem', quality: 'Qualidade',
			filename: 'Nome do arquivo', autoCrop: 'Recortar o documento ao importar fotos', scanFilter: 'Filtro padrão do scanner', none: 'Sem',
			sizes: { fit: 'Igual à imagem', a4: 'A4', letter: 'Carta', legal: 'Ofício', a3: 'A3', a5: 'A5' },
			orientations: { auto: 'Automática', portrait: 'Retrato', landscape: 'Paisagem' },
			fits: { contain: 'Inteira', cover: 'Preencher', stretch: 'Esticar' },
			qualities: { original: 'Original', high: 'Alta', balanced: 'Equilibrada', small: 'Compacta' },
			qualityHints: {
				original: 'Resolução total. JPEG sem edição entra sem recompressão; PNG fica sem perdas.',
				high: '300 dpi: para impressão e arquivo.',
				balanced: '200 dpi: nítido na tela e ainda leve.',
				small: '130 dpi: ideal para e-mail, WhatsApp e upload com limite.'
			}
		},
		export: {
			build: 'Gerar PDF', building: 'Gerando… {pct}%', stop: 'Parar', ready: 'PDF pronto', info: '{pages} páginas · {size} · {secs}s',
			passthrough: '{count} sem recompressão', download: 'Baixar PDF', open: 'Abrir', share: 'Compartilhar', images: 'Baixar como imagens',
			saved: 'Salvo', failed: 'Não foi possível gerar: {msg}'
		},
		editor: {
			title: 'Editar página {n}', crop: 'Recortar', filter: 'Filtro', auto: 'Detectar', full: 'Página inteira', noDetect: 'Nenhum documento detectado nesta foto.',
			threshold: 'Limiar', lighter: 'Mais claro', darker: 'Mais escuro', apply: 'Aplicar', cancel: 'Cancelar', loading: 'Carregando…',
			hint: 'Arraste os cantos ou as bordas. A perspectiva é corrigida e a proporção real do papel é calculada.', corner: 'Canto {n}', edge: 'Borda {n}'
		},
		scanner: {
			title: 'Scanner', close: 'Fechar scanner', torch: 'Lanterna', auto: 'Captura automática', capture: 'Capturar', gallery: 'Importar fotos',
			switchCam: 'Trocar câmera', done: 'Concluir', review: 'Revisar cada foto', retake: 'Refazer', keep: 'Usar foto',
			searching: 'Procurando o documento…', hold: 'Segure firme…', closer: 'Aproxime do documento', found: 'Documento encontrado',
			starting: 'Abrindo a câmera…', processing: 'Processando a foto…', denied: 'Permissão da câmera negada. Libere nas configurações do navegador ou use a câmera do aparelho.',
			unavailable: 'Câmera ao vivo indisponível aqui (exige HTTPS e uma câmera). Use a câmera do aparelho: o recorte automático funciona igual.',
			native: 'Usar câmera do aparelho', retry: 'Tentar de novo', captured: '{count} capturadas', filter: 'Filtro'
		}
	},
	en: {
		title: 'PDF & Scanner',
		pagesCount: '{count} pages',
		actions: {
			scan: 'Scan', add: 'Add images', clear: 'Clear all', sortName: 'Sort by name', reverse: 'Reverse order',
			filterAll: 'Filter for all', autoCropAll: 'Crop detected documents', more: 'More actions'
		},
		empty: {
			title: 'Turn images into a PDF, or scan documents with your camera',
			body: 'Drag images, paste (Ctrl+V) or take photos. Automatic cropping with perspective correction, shadow removal and filters. Everything runs on your device: nothing is uploaded.',
			formats: 'JPG, PNG, WebP, HEIC (iPhone), AVIF, GIF, BMP and SVG'
		},
		drop: 'Drop to add the images',
		importing: 'Reading {count} images…',
		importErrors: 'Could not open:',
		dismiss: 'Dismiss',
		page: {
			label: 'Page {n}', edit: 'Edit crop and filter', rotateL: 'Rotate left', rotateR: 'Rotate right', duplicate: 'Duplicate',
			remove: 'Remove', drag: 'Drag to reorder (arrow keys also move it)', processing: 'Processing…', error: 'Processing failed', cropped: 'Cropped'
		},
		filters: { original: 'Original', enhance: 'Enhanced', gray: 'Grayscale', bw: 'B&W' },
		filterHints: {
			original: 'The photo as it is.',
			enhance: 'White paper, no shadows, vivid colors. Best for most documents.',
			gray: 'Clean, sharp grayscale.',
			bw: 'Pure black and white: crisp text and a very small PDF (1 bit).'
		},
		settings: {
			title: 'PDF settings', size: 'Page size', orientation: 'Orientation', fit: 'Fit', margin: 'Margin', quality: 'Quality',
			filename: 'File name', autoCrop: 'Crop the document when importing photos', scanFilter: 'Default scanner filter', none: 'None',
			sizes: { fit: 'Same as image', a4: 'A4', letter: 'Letter', legal: 'Legal', a3: 'A3', a5: 'A5' },
			orientations: { auto: 'Automatic', portrait: 'Portrait', landscape: 'Landscape' },
			fits: { contain: 'Whole', cover: 'Fill', stretch: 'Stretch' },
			qualities: { original: 'Original', high: 'High', balanced: 'Balanced', small: 'Compact' },
			qualityHints: {
				original: 'Full resolution. Unedited JPEGs go in without recompression; PNGs stay lossless.',
				high: '300 dpi: for printing and archiving.',
				balanced: '200 dpi: sharp on screen and still light.',
				small: '130 dpi: ideal for email, WhatsApp and size-limited uploads.'
			}
		},
		export: {
			build: 'Create PDF', building: 'Creating… {pct}%', stop: 'Stop', ready: 'PDF ready', info: '{pages} pages · {size} · {secs}s',
			passthrough: '{count} without recompression', download: 'Download PDF', open: 'Open', share: 'Share', images: 'Download as images',
			saved: 'Saved', failed: 'Could not create it: {msg}'
		},
		editor: {
			title: 'Edit page {n}', crop: 'Crop', filter: 'Filter', auto: 'Detect', full: 'Whole page', noDetect: 'No document detected in this photo.',
			threshold: 'Threshold', lighter: 'Lighter', darker: 'Darker', apply: 'Apply', cancel: 'Cancel', loading: 'Loading…',
			hint: 'Drag the corners or edges. Perspective is corrected and the real paper proportion is computed.', corner: 'Corner {n}', edge: 'Edge {n}'
		},
		scanner: {
			title: 'Scanner', close: 'Close scanner', torch: 'Flashlight', auto: 'Auto capture', capture: 'Capture', gallery: 'Import photos',
			switchCam: 'Switch camera', done: 'Done', review: 'Review each photo', retake: 'Retake', keep: 'Use photo',
			searching: 'Looking for the document…', hold: 'Hold steady…', closer: 'Move closer to the document', found: 'Document found',
			starting: 'Opening the camera…', processing: 'Processing the photo…', denied: 'Camera permission denied. Allow it in the browser settings or use the device camera.',
			unavailable: 'Live camera is not available here (it needs HTTPS and a camera). Use the device camera: automatic cropping works the same.',
			native: 'Use device camera', retry: 'Try again', captured: '{count} captured', filter: 'Filter'
		}
	},
	es: {
		title: 'PDF y Escáner',
		pagesCount: '{count} páginas',
		actions: {
			scan: 'Escanear', add: 'Añadir imágenes', clear: 'Borrar todo', sortName: 'Ordenar por nombre', reverse: 'Invertir orden',
			filterAll: 'Filtro para todas', autoCropAll: 'Recortar documentos detectados', more: 'Más acciones'
		},
		empty: {
			title: 'Imágenes a PDF, o escanea documentos con la cámara',
			body: 'Arrastra imágenes, pega (Ctrl+V) o toma fotos. Recorte automático con corrección de perspectiva, eliminación de sombras y filtros. Todo se ejecuta en tu dispositivo: nada se envía.',
			formats: 'JPG, PNG, WebP, HEIC (iPhone), AVIF, GIF, BMP y SVG'
		},
		drop: 'Suelta para añadir las imágenes',
		importing: 'Leyendo {count} imágenes…',
		importErrors: 'No se pudo abrir:',
		dismiss: 'Descartar',
		page: {
			label: 'Página {n}', edit: 'Editar recorte y filtro', rotateL: 'Girar a la izquierda', rotateR: 'Girar a la derecha', duplicate: 'Duplicar',
			remove: 'Quitar', drag: 'Arrastra para reordenar (las flechas del teclado también la mueven)', processing: 'Procesando…', error: 'Error al procesar', cropped: 'Recortada'
		},
		filters: { original: 'Original', enhance: 'Mejorado', gray: 'Grises', bw: 'B/N' },
		filterHints: {
			original: 'La foto tal cual.',
			enhance: 'Papel blanco, sin sombras, colores vivos. Lo mejor para la mayoría de los documentos.',
			gray: 'Escala de grises limpia y nítida.',
			bw: 'Blanco y negro puro: texto nítido y un PDF muy pequeño (1 bit).'
		},
		settings: {
			title: 'Ajustes del PDF', size: 'Tamaño de página', orientation: 'Orientación', fit: 'Encaje', margin: 'Margen', quality: 'Calidad',
			filename: 'Nombre del archivo', autoCrop: 'Recortar el documento al importar fotos', scanFilter: 'Filtro predeterminado del escáner', none: 'Sin',
			sizes: { fit: 'Igual a la imagen', a4: 'A4', letter: 'Carta', legal: 'Oficio', a3: 'A3', a5: 'A5' },
			orientations: { auto: 'Automática', portrait: 'Vertical', landscape: 'Horizontal' },
			fits: { contain: 'Completa', cover: 'Rellenar', stretch: 'Estirar' },
			qualities: { original: 'Original', high: 'Alta', balanced: 'Equilibrada', small: 'Compacta' },
			qualityHints: {
				original: 'Resolución completa. Los JPEG sin editar entran sin recompresión; los PNG quedan sin pérdidas.',
				high: '300 ppp: para imprimir y archivar.',
				balanced: '200 ppp: nítido en pantalla y ligero.',
				small: '130 ppp: ideal para correo, WhatsApp y subidas con límite.'
			}
		},
		export: {
			build: 'Crear PDF', building: 'Creando… {pct}%', stop: 'Detener', ready: 'PDF listo', info: '{pages} páginas · {size} · {secs}s',
			passthrough: '{count} sin recompresión', download: 'Descargar PDF', open: 'Abrir', share: 'Compartir', images: 'Descargar como imágenes',
			saved: 'Guardado', failed: 'No se pudo crear: {msg}'
		},
		editor: {
			title: 'Editar página {n}', crop: 'Recortar', filter: 'Filtro', auto: 'Detectar', full: 'Página completa', noDetect: 'No se detectó ningún documento en esta foto.',
			threshold: 'Umbral', lighter: 'Más claro', darker: 'Más oscuro', apply: 'Aplicar', cancel: 'Cancelar', loading: 'Cargando…',
			hint: 'Arrastra las esquinas o los bordes. Se corrige la perspectiva y se calcula la proporción real del papel.', corner: 'Esquina {n}', edge: 'Borde {n}'
		},
		scanner: {
			title: 'Escáner', close: 'Cerrar escáner', torch: 'Linterna', auto: 'Captura automática', capture: 'Capturar', gallery: 'Importar fotos',
			switchCam: 'Cambiar cámara', done: 'Listo', review: 'Revisar cada foto', retake: 'Repetir', keep: 'Usar foto',
			searching: 'Buscando el documento…', hold: 'Mantén firme…', closer: 'Acércate al documento', found: 'Documento encontrado',
			starting: 'Abriendo la cámara…', processing: 'Procesando la foto…', denied: 'Permiso de cámara denegado. Actívalo en los ajustes del navegador o usa la cámara del dispositivo.',
			unavailable: 'La cámara en vivo no está disponible aquí (requiere HTTPS y una cámara). Usa la cámara del dispositivo: el recorte automático funciona igual.',
			native: 'Usar cámara del dispositivo', retry: 'Reintentar', captured: '{count} capturadas', filter: 'Filtro'
		}
	},
	fr: {
		title: 'PDF et Scanner',
		pagesCount: '{count} pages',
		actions: {
			scan: 'Scanner', add: 'Ajouter des images', clear: 'Tout effacer', sortName: 'Trier par nom', reverse: 'Inverser l’ordre',
			filterAll: 'Filtre pour toutes', autoCropAll: 'Recadrer les documents détectés', more: 'Plus d’actions'
		},
		empty: {
			title: 'Des images en PDF, ou scannez des documents avec la caméra',
			body: 'Glissez des images, collez (Ctrl+V) ou prenez des photos. Recadrage automatique avec correction de perspective, suppression des ombres et filtres. Tout s’exécute sur votre appareil : rien n’est envoyé.',
			formats: 'JPG, PNG, WebP, HEIC (iPhone), AVIF, GIF, BMP et SVG'
		},
		drop: 'Déposez pour ajouter les images',
		importing: 'Lecture de {count} images…',
		importErrors: 'Impossible d’ouvrir :',
		dismiss: 'Ignorer',
		page: {
			label: 'Page {n}', edit: 'Modifier le recadrage et le filtre', rotateL: 'Pivoter à gauche', rotateR: 'Pivoter à droite', duplicate: 'Dupliquer',
			remove: 'Retirer', drag: 'Glissez pour réordonner (les flèches du clavier la déplacent aussi)', processing: 'Traitement…', error: 'Échec du traitement', cropped: 'Recadrée'
		},
		filters: { original: 'Original', enhance: 'Amélioré', gray: 'Gris', bw: 'N&B' },
		filterHints: {
			original: 'La photo telle quelle.',
			enhance: 'Papier blanc, sans ombres, couleurs vives. Idéal pour la plupart des documents.',
			gray: 'Niveaux de gris propres et nets.',
			bw: 'Noir et blanc pur : texte net et PDF très léger (1 bit).'
		},
		settings: {
			title: 'Réglages du PDF', size: 'Format de page', orientation: 'Orientation', fit: 'Ajustement', margin: 'Marge', quality: 'Qualité',
			filename: 'Nom du fichier', autoCrop: 'Recadrer le document à l’import des photos', scanFilter: 'Filtre par défaut du scanner', none: 'Aucune',
			sizes: { fit: 'Comme l’image', a4: 'A4', letter: 'Lettre US', legal: 'Légal US', a3: 'A3', a5: 'A5' },
			orientations: { auto: 'Automatique', portrait: 'Portrait', landscape: 'Paysage' },
			fits: { contain: 'Entière', cover: 'Remplir', stretch: 'Étirer' },
			qualities: { original: 'Originale', high: 'Haute', balanced: 'Équilibrée', small: 'Compacte' },
			qualityHints: {
				original: 'Pleine résolution. Les JPEG non modifiés sont intégrés sans recompression ; les PNG restent sans perte.',
				high: '300 dpi : pour l’impression et l’archivage.',
				balanced: '200 dpi : net à l’écran et léger.',
				small: '130 dpi : idéal pour l’e-mail, WhatsApp et les envois limités.'
			}
		},
		export: {
			build: 'Créer le PDF', building: 'Création… {pct} %', stop: 'Arrêter', ready: 'PDF prêt', info: '{pages} pages · {size} · {secs} s',
			passthrough: '{count} sans recompression', download: 'Télécharger le PDF', open: 'Ouvrir', share: 'Partager', images: 'Télécharger en images',
			saved: 'Enregistré', failed: 'Impossible de le créer : {msg}'
		},
		editor: {
			title: 'Modifier la page {n}', crop: 'Recadrer', filter: 'Filtre', auto: 'Détecter', full: 'Page entière', noDetect: 'Aucun document détecté sur cette photo.',
			threshold: 'Seuil', lighter: 'Plus clair', darker: 'Plus foncé', apply: 'Appliquer', cancel: 'Annuler', loading: 'Chargement…',
			hint: 'Faites glisser les coins ou les bords. La perspective est corrigée et la proportion réelle du papier est calculée.', corner: 'Coin {n}', edge: 'Bord {n}'
		},
		scanner: {
			title: 'Scanner', close: 'Fermer le scanner', torch: 'Lampe', auto: 'Capture automatique', capture: 'Capturer', gallery: 'Importer des photos',
			switchCam: 'Changer de caméra', done: 'Terminer', review: 'Vérifier chaque photo', retake: 'Reprendre', keep: 'Utiliser la photo',
			searching: 'Recherche du document…', hold: 'Ne bougez plus…', closer: 'Rapprochez-vous du document', found: 'Document trouvé',
			starting: 'Ouverture de la caméra…', processing: 'Traitement de la photo…', denied: 'Accès à la caméra refusé. Autorisez-le dans les réglages du navigateur ou utilisez la caméra de l’appareil.',
			unavailable: 'Caméra en direct indisponible ici (HTTPS et caméra requis). Utilisez la caméra de l’appareil : le recadrage automatique fonctionne pareil.',
			native: 'Caméra de l’appareil', retry: 'Réessayer', captured: '{count} capturées', filter: 'Filtre'
		}
	}
});
