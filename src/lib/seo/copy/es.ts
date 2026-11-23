// Textos en español neutro de las páginas de SEO (conversor y editor de imágenes).
import type { Copy } from './types.ts';

export const es: Copy = {
	fmt: {
		jpg: {
			full: 'JPEG (Joint Photographic Experts Group)',
			about: 'JPG, o JPEG, es el formato estándar de las fotos de cámaras y de la mayoría de los celulares. Usa compresión con pérdida, no tiene transparencia y se abre en prácticamente cualquier programa, sitio web o sistema.',
			pain: 'JPG no tiene transparencia y cada vez que se vuelve a guardar pierde algo de calidad, algo que perjudica a logotipos, capturas de pantalla e imágenes que todavía vas a editar.',
			gain: 'JPG se acepta en todas partes: formularios de carga, correo, Office, imprentas y programas antiguos.'
		},
		png: {
			full: 'PNG (Portable Network Graphics)',
			about: 'PNG es un formato sin pérdida y con transparencia completa, el estándar para capturas de pantalla, logotipos, gráficos de interfaz y todo lo que tenga texto o bordes nítidos. Funciona en cualquier navegador y editor, pero las fotos en PNG pesan mucho.',
			pain: 'Las fotos en PNG pesan mucho: una imagen de 1 MB en JPG fácilmente pasa a 3 o 5 MB en PNG, lo que vuelve lentas las páginas y llena el almacenamiento.',
			gain: 'PNG conserva cada píxel exactamente igual y admite transparencia, por eso es la opción segura para editar, para capturas y para gráficos con texto.'
		},
		webp: {
			full: 'WebP (Google)',
			about: 'WebP es un formato moderno creado por Google para la web. Admite compresión con y sin pérdida y transparencia, y todos los navegadores actuales lo muestran. Algunos programas antiguos, imprentas y formularios todavía lo rechazan.',
			pain: 'Las imágenes WebP descargadas de sitios web muchas veces no abren en editores antiguos, en Office, en imprentas ni en algunos formularios de carga.',
			gain: 'WebP suele pesar entre un 25 % y un 35 % menos que JPG con la misma calidad visual y además admite transparencia, lo que acelera la carga de las páginas.'
		},
		avif: {
			full: 'AVIF (AV1 Image File Format)',
			about: 'AVIF se basa en el códec de video AV1 y hoy es uno de los formatos de imagen más eficientes: archivos muy pequeños, con transparencia y buen nivel de detalle. Los navegadores modernos lo admiten, pero muchos programas y sistemas antiguos todavía no lo abren.',
			pain: 'AVIF todavía es desconocido para muchos programas: versiones antiguas de Windows y macOS, Office y varios editores no pueden abrirlo.',
			gain: 'AVIF produce algunos de los archivos más pequeños disponibles hoy, a menudo la mitad que un JPG comparable, y admite transparencia.'
		},
		gif: {
			full: 'GIF (Graphics Interchange Format)',
			about: 'GIF es uno de los formatos más antiguos de la web, famoso por las animaciones cortas. Está limitado a 256 colores por cuadro y su transparencia es de todo o nada, así que las fotos se ven con bandas y los archivos son grandes.',
			pain: 'GIF tiene como máximo 256 colores, así que los degradados y las fotos se ven granulados, y el archivo pesa mucho para lo que muestra.',
			gain: 'GIF se abre en cualquier navegador, cliente de correo y aplicación de mensajería, incluso en los más antiguos.'
		},
		bmp: {
			full: 'BMP (mapa de bits de Windows)',
			about: 'BMP es el mapa de bits clásico de Windows, sin compresión. Guarda los píxeles en bruto, así que es simple y sin pérdida, pero enorme. Hoy aparece sobre todo en programas antiguos, escáneres y sistemas embebidos.',
			pain: 'BMP no tiene compresión, genera archivos enormes y muchos sitios y aplicaciones no lo aceptan.',
			gain: 'BMP lo exigen algunos programas heredados, equipos industriales y pantallas embebidas que solo leen mapas de bits puros.'
		},
		ico: {
			full: 'ICO (icono de Windows)',
			about: 'ICO es el formato de iconos de Windows y el clásico favicon.ico. Un solo archivo puede contener varios tamaños del mismo icono (de 16×16 a 256×256) y cada lugar usa el más nítido.',
			pain: 'Los archivos ICO son difíciles de reutilizar: la mayoría de los editores, sitios web y aplicaciones de mensajería no los abren directamente.',
			gain: 'ICO sigue siendo el formato de favicon más compatible y el que Windows espera para accesos directos e iconos de programas.'
		},
		svg: {
			full: 'SVG (Scalable Vector Graphics)',
			about: 'SVG describe formas en lugar de píxeles, así que se puede ampliar sin perder nitidez. Es ideal para logotipos, iconos e ilustraciones y los navegadores lo muestran de forma nativa, pero muchos formularios y redes sociales no lo aceptan.',
			pain: 'SVG suele ser rechazado por redes sociales, marketplaces, Office y formularios que esperan una imagen común.',
			gain: 'SVG se amplía a cualquier tamaño sin perder nitidez y suele ser diminuto para logotipos e ilustraciones planas.'
		},
		heic: {
			full: 'HEIC/HEIF (High Efficiency Image File)',
			about: 'HEIC es el formato predeterminado de las fotos del iPhone y del iPad. Mantiene buena calidad con cerca de la mitad del peso de un JPG, pero Windows, Android, muchos sitios web y la mayoría de los formularios no lo abren sin software adicional.',
			pain: 'Las fotos HEIC del iPhone muchas veces no abren en Windows, en Android ni en sitios web, y los formularios de carga las rechazan.',
			gain: ''
		},
		tiff: {
			full: 'TIFF (Tagged Image File Format)',
			about: 'TIFF es un formato profesional usado en digitalización, imprenta, editoriales y archivo. Normalmente es sin pérdida y admite alta profundidad de color, pero los archivos son grandes y los navegadores no lo muestran.',
			pain: 'TIFF genera archivos grandes y los navegadores, clientes de correo y la mayoría de los sitios web no pueden mostrarlo.',
			gain: 'TIFF es lo que suelen pedir imprentas, escáneres, editoriales y archivos, porque es sin pérdida y lo admite el software profesional.'
		},
		psd: {
			full: 'PSD (documento de Adobe Photoshop)',
			about: 'PSD es el archivo de trabajo de Adobe Photoshop, con capas, máscaras y efectos. Es ideal para editar, pero solo se abre con Photoshop o un editor compatible, y los archivos pesan mucho.',
			pain: 'Un PSD necesita Photoshop o un editor compatible para abrirse, así que clientes, sitios web y celulares normalmente ni siquiera pueden previsualizarlo.',
			gain: ''
		},
		pdf: {
			full: 'PDF (Portable Document Format)',
			about: 'PDF es el formato universal de documentos. Se abre en cualquier computadora o celular, se imprime sin sorpresas y es lo que suelen pedir formularios, escuelas, bancos y portales de gobierno.',
			pain: '',
			gain: 'PDF es lo que piden portales, escuelas, bancos y oficinas cuando necesitas adjuntar, imprimir o enviar documentos escaneados.'
		}
	},
	pairLabel: (A, B) => `${A} a ${B}`,
	pairTitle: (A, B) => `Convertir ${A} a ${B} online gratis y sin subir`,
	pairH1: (A, B) => `Convertir ${A} a ${B} online`,
	pairLead: (A, B) =>
		`Convierte imágenes ${A} a ${B} aquí mismo, en el navegador. Tus archivos no salen de tu dispositivo, no hace falta registrarse, no hay marca de agua y puedes convertir decenas de imágenes a la vez.`,
	pairDesc: (A, B, hook) => [
		`Convierte ${A} a ${B} gratis en el navegador. ${hook} Por lotes, sin subir archivos, sin registro y sin marca de agua.`,
		`Convierte ${A} a ${B} gratis en el navegador. ${hook} Por lotes, sin subir archivos y sin registro.`,
		`Convierte ${A} a ${B} gratis. ${hook} Sin subir archivos y sin registro.`,
		`${A} a ${B} gratis y privado. ${hook}`
	],
	hook: {
		heic: () => 'Las fotos del iPhone se abren en todas partes, sin la ubicación.',
		trace: () => 'Vectorización real, con la cantidad de colores que elijas.',
		pdf: () => 'Cada imagen se convierte en una página del PDF, lista para enviar.',
		ico: () => 'Favicon con varios tamaños en un solo archivo, de 16 a 256 px.',
		psd: () => 'Archivos de Photoshop aplanados sin necesidad de abrir Photoshop.',
		gifFrame: () => 'Usa el primer cuadro del GIF, con todos sus colores.',
		raster: () => 'El vector se dibuja en píxeles al tamaño que definas.',
		icoIn: () => 'Extrae el icono como imagen común, fácil de editar y compartir.',
		alpha: () => 'Elige el color de fondo para las zonas transparentes.',
		palette: () => 'Paleta de 256 colores para máxima compatibilidad.',
		smaller: () => 'Archivos más livianos con ajuste de calidad o tamaño en KB.',
		lossless: () => 'Salida sin pérdida que no se degrada en las siguientes ediciones.',
		archive: () => 'Salida sin pérdida para imprenta, archivo y programas antiguos.',
		generic: () => 'Respeta la orientación y elimina metadatos por privacidad.'
	},
	h2: {
		why: (A, B) => `¿Por qué convertir ${A} a ${B}?`,
		changes: () => 'Qué cambia en la conversión',
		size: (A, B) => `Tamaño del archivo: ${A} frente a ${B}`,
		not: () => 'Cuándo es mejor no convertir',
		about: (A, B) => `Sobre ${A} y ${B}`
	},
	note: {
		heic: () => 'Las fotos HEIC se decodifican en tu dispositivo, se giran según la orientación EXIF y se guardan sin los metadatos de la cámara, así que la ubicación GPS de la foto del iPhone no pasa al nuevo archivo.',
		psd: () => 'El PSD se aplana: todas las capas visibles, máscaras y efectos se combinan en una sola imagen, tal como la muestra Photoshop. Si necesitas las capas, abre el archivo en el editor.',
		gifFrame: () => 'Solo se convierte el primer cuadro de un GIF animado. Los GIF de un solo cuadro se convierten completos.',
		raster: (A) => `El ${A} se dibuja en píxeles. La nitidez del vector pasa a ser una resolución fija, así que define un tamaño grande en las opciones de redimensionar si necesitas una imagen grande.`,
		trace: (A) => `Es vectorización real: el ${A} se convierte en trazados SVG, no solo se incrusta dentro de un archivo SVG. Tú eliges la cantidad de colores; menos colores dan formas más limpias y archivos más pequeños, más colores conservan más detalle.`,
		pdf: () => 'Cada imagen va a su propia página del PDF, así que un lote de fotos o documentos escaneados se convierte en páginas listas para enviar, imprimir o adjuntar a un formulario.',
		ico: () => 'El ICO se genera con varios tamaños dentro de un solo archivo (de 16×16 a 256×256), como esperan los navegadores y Windows de un favicon o icono de programa. Las imágenes cuadradas dan el mejor resultado.',
		icoIn: (A, B) => `La imagen del icono dentro del ${A} se convierte en un archivo ${B} común, que puedes editar, subir o compartir como cualquier foto.`,
		palette: (A, B) => `${B} guarda como máximo 256 colores, así que el conversor arma una paleta optimizada. Los gráficos planos se mantienen nítidos, pero las fotos y degradados pueden mostrar bandas.`,
		alphaLost: (A, B) => `${B} no tiene transparencia. Las zonas transparentes del ${A} se rellenan con el color de fondo que elijas (blanco por defecto), para que el logotipo no quede dentro de un recuadro negro.`,
		alphaKept: (A, B) => `La transparencia se conserva: los píxeles transparentes y semitransparentes del ${A} siguen siendo transparentes en el ${B}.`,
		toLossy: (A, B) => `${B} usa compresión con pérdida, así que controlas el equilibrio con el ajuste de calidad, o indicas un tamaño objetivo en KB y el conversor encuentra la calidad adecuada.`,
		lossyToLossless: (A, B) => `${B} es sin pérdida, así que a partir de aquí no se pierde nada más, pero no recupera el detalle que la compresión del ${A} ya descartó.`,
		exact: (A, B) => `Aquí ambos formatos son sin pérdida, así que los píxeles del ${A} pasan al ${B} exactamente iguales, sin perder calidad. Solo cambia la forma de guardarlos.`,
		exif: () => 'Se respeta la orientación EXIF, así que las fotos giradas salen derechas, y se eliminan metadatos como la ubicación GPS, el modelo de cámara y la fecha por privacidad.'
	},
	size: {
		smaller: (A, B) => `En fotos, el ${B} suele ser bastante más liviano que el ${A} con una calidad visual parecida. El ahorro exacto depende del contenido: las fotos con mucho detalle comprimen menos que los gráficos planos.`,
		larger: (A, B) => `Los archivos ${B} serán más grandes que los ${A} originales, a veces varias veces más en fotos, porque ${B} guarda más datos por píxel. Es el precio de la compatibilidad o de la calidad sin pérdida.`,
		similar: (A, B) => `${A} y ${B} suelen quedar en un rango de tamaño parecido. El resultado depende más de las dimensiones de la imagen y de la calidad elegida que del formato en sí.`,
		toSvg: (A) => `El tamaño del SVG depende de lo compleja que sea la imagen, no de la cantidad de píxeles. Un logotipo con pocos colores planos queda en un archivo diminuto; una foto ${A} con mucho detalle genera miles de trazados y un SVG grande.`,
		toIco: () => 'Los archivos ICO son pequeños: incluso con todos los tamaños hasta 256×256, un favicon suele quedarse en decenas de KB.',
		toPdf: (A) => `El PDF pesa más o menos lo mismo que las imágenes que contiene. Para enviar un PDF más liviano, reduce las dimensiones de las imágenes ${A} en las opciones de redimensionar antes de convertir.`,
		fromSvg: (A, B) => `Un ${A} de pocos KB puede convertirse en un ${B} mucho más grande, porque la salida guarda cada píxel. El tamaño crece con la resolución que elijas.`,
		fromIco: (A, B) => `Los iconos son imágenes pequeñas, así que el archivo ${B} también será pequeño, normalmente de pocos KB.`
	},
	sizeTip: () => 'También puedes redimensionar en el mismo paso (por porcentaje, para que quepa en un recuadro o a píxeles exactos) y aligerar aún más los archivos.',
	not: {
		keepLayers: (A) => `Guarda el ${A} original si lo vas a seguir editando: al aplanar, las capas se combinan para siempre. Convierte una copia para compartir.`,
		keepAnim: (A, B) => `Si la animación importa, quédate con el ${A}: un ${B} estático solo guarda el primer cuadro.`,
		keepVector: (A) => `Para logotipos e iconos en sitios web, mantén el ${A}: se ve nítido en cualquier tamaño y suele pesar menos. Convierte solo donde se exija una imagen común.`,
		noPhotoTrace: (A) => `No esperes una copia perfecta al vectorizar fotos ${A}: el trazado funciona mejor con logotipos, iconos, dibujos e ilustraciones planas con pocos colores.`,
		icoPhoto: () => 'No uses ICO para fotos comunes: está pensado para iconos pequeños y cuadrados.',
		pdfEdit: (A) => `Si quien recibe el archivo necesita editar o reutilizar la imagen, envía el ${A} directamente: sacar imágenes de un PDF es más complicado.`,
		keepLossless: (A, B) => `Para capturas de pantalla, texto, diagramas y logotipos con bordes nítidos, el ${A} puede seguir siendo la mejor opción; el ${B}, con pérdida, puede desenfocar las letras con calidades bajas.`,
		recompress: (A, B) => `Pasar de un formato con pérdida a otro comprime la imagen dos veces. Usa una calidad alta y parte del ${A} original, no de una copia que ya se volvió a guardar.`,
		lossyGrow: (A, B) => `Si solo quieres un archivo más liviano, ${B} es el camino equivocado: quedará más grande que el ${A} sin verse mejor.`,
		heavy: (A, B) => `${B} no está pensado para la web: los navegadores y las aplicaciones de mensajería lo manejan mal. Úsalo solo cuando un programa o una imprenta lo pidan.`,
		avifCompat: (A, B) => `Revisa a dónde va el archivo: ${B} es excelente para sitios web, pero algunos programas, sistemas antiguos y formularios todavía no lo abren.`,
		generic: (A) => `Si el ${A} ya funciona donde lo necesitas, no hay motivo para convertirlo. Cada conversión es una oportunidad de cambiar el tamaño o la calidad.`
	},
	faq: {
		heic: () => ({ q: '¿Puedo convertir fotos directamente desde el iPhone?', a: 'Sí. Abre esta página en el iPhone, elige las fotos de la galería o de la app Archivos y la conversión se hace en el propio teléfono. También se aceptan archivos HEIF.' }),
		psd: () => ({ q: '¿Se conservan las capas de Photoshop?', a: 'En esta conversión no: el PSD se aplana en una sola imagen, tal como se ve en Photoshop. Para trabajar con las capas, ábrelo en el editor online, que lee y exporta PSD con capas.' }),
		anim: (A, B) => ({ q: `¿La animación del ${A} pasa al ${B}?`, a: `No. El conversor lee el primer cuadro del ${A}, así que el ${B} es una imagen fija de ese cuadro.` }),
		trace: (A) => ({ q: '¿El SVG es un vector real o solo una imagen incrustada?', a: `Es un vector real. El ${A} se convierte en trazados SVG con la cantidad de colores que elijas, así que puedes ampliarlo y editarlo en Illustrator, Inkscape o Figma.` }),
		svgSize: (A, B) => ({ q: `¿Qué resolución tendrá el ${B}?`, a: `Por defecto, el tamaño definido en el ${A}. Usa las opciones de redimensionar para fijar un porcentaje o píxeles exactos; como el origen es vectorial, ampliar no lo desenfoca.` }),
		pdf: (A) => ({ q: '¿Cómo quedan las páginas en el PDF?', a: `Cada imagen ${A} va en su propia página, en el orden de la lista: diez imágenes son diez páginas.` }),
		ico: () => ({ q: '¿Qué tamaños incluye el ICO?', a: 'Varios tamaños de icono estándar, de 16×16 a 256×256, en un solo archivo. Sirve como favicon.ico y como icono de Windows.' }),
		alphaLost: (A, B) => ({ q: '¿Qué pasa con el fondo transparente?', a: `${B} no admite transparencia, así que las zonas transparentes reciben el color de fondo que definas (blanco por defecto). Usa PNG o WebP si necesitas conservar la transparencia.` }),
		alphaKept: (A, B) => ({ q: '¿Se conserva la transparencia?', a: `Sí. Los píxeles transparentes y semitransparentes del ${A} siguen siendo transparentes en el ${B}.` }),
		quality: (A, B) => ({ q: `¿Puedo elegir la calidad o el tamaño del ${B}?`, a: 'Sí. Usa el ajuste de calidad o escribe un tamaño objetivo en KB y el conversor busca la mayor calidad que entra en ese límite.' }),
		lossless: (A, B) => ({ q: `¿Convertir a ${B} mejora la calidad de mi ${A}?`, a: `No. ${B} evita nuevas pérdidas, pero el detalle que eliminó la compresión del ${A} no vuelve.` })
	},
	faqSize: (A, B) => `¿${B} pesa menos que ${A}?`,
	faqBatch: (A, B) => ({ q: `¿Puedo convertir muchos ${A} a ${B} a la vez?`, a: `Sí. Suelta todos los archivos ${A} que quieras; se convierten en paralelo y los descargas uno por uno, en un ZIP o directamente en una carpeta.` }),
	general: {
		free: { q: '¿De verdad es gratis?', a: 'Sí. Sin registro, sin marca de agua, sin límite diario y sin plan de pago. Es gratis porque todo el trabajo ocurre en tu propio dispositivo.' },
		upload: { q: '¿Mis imágenes se suben a un servidor?', a: 'No. Todo se ejecuta en el navegador con Web Workers; los archivos no salen de tu dispositivo. Los metadatos como la ubicación GPS se eliminan del resultado.' },
		batch: { q: '¿Cuántas imágenes puedo convertir a la vez?', a: 'No hay un límite fijo. Los archivos se procesan en paralelo y el límite práctico es la memoria de tu dispositivo.' },
		phone: { q: '¿Funciona en iPhone y Android?', a: 'Sí. Funciona en cualquier navegador móvil moderno, incluido Safari en iPhone y Chrome en Android, sin instalar ninguna app.' }
	},
	steps: {
		add: (A) => `Arrastra tus archivos ${A} al conversor de arriba o toca para elegirlos. Puedes agregar muchos a la vez.`,
		target: (A, B) => `${B} ya está seleccionado como formato de salida en esta página.`,
		convert: (A, B) => `Convierte y descarga cada ${B}, todo en un ZIP o guárdalo directamente en una carpeta (Chrome y Edge).`
	},
	opt: {
		quality: (A, B) => `Ajusta la calidad del ${B} o define un tamaño objetivo en KB.`,
		background: (A, B) => `Elige el color de fondo para las zonas transparentes (${B} no tiene transparencia).`,
		colors: () => 'Elige la cantidad de colores de la vectorización.',
		icoSizes: () => 'Usa una imagen cuadrada: los tamaños del icono hasta 256×256 se generan automáticamente.',
		pdfPage: () => 'Ordena los archivos en la lista: cada imagen será una página.',
		resize: () => 'Si quieres, redimensiona por porcentaje, para que quepa en un recuadro o a píxeles exactos.'
	},
	hubs: {
		converter: {
			label: 'Convertidor de imágenes',
			title: 'Convertidor de imágenes online gratis y sin subir',
			description: 'Convierte JPG, PNG, WebP, AVIF, HEIC, GIF, TIFF, PSD y SVG en el navegador. Conversión por lotes, compresión y redimensionado, sin subir archivos.',
			h1: 'Convertidor de imágenes online y gratis',
			lead: 'Convierte imágenes entre 11 formatos de entrada y 11 de salida directamente en el navegador. Los archivos se procesan en tu dispositivo, nunca se suben, y puedes convertir una carpeta entera de una vez.',
			sections: [
				{ h2: 'Formatos que lee y genera', body: [
					'Entrada: JPG/JPEG, PNG, WebP, AVIF, GIF (primer cuadro), BMP, ICO, SVG, HEIC/HEIF del iPhone, TIFF y PSD de Photoshop (aplanado).',
					'Salida: JPG, PNG, WebP, AVIF, GIF, BMP, ICO con varios tamaños para favicon, TIFF, PDF con una página por imagen, SVG vectorial real con cantidad de colores ajustable y PSD.'
				] },
				{ h2: 'Opciones que marcan la diferencia', body: [
					'Define la calidad de JPG, WebP y AVIF, o indica un tamaño objetivo en KB y deja que el conversor encuentre la mejor calidad que entra. Redimensiona por porcentaje, para que quepa en un recuadro o a píxeles exactos.',
					'Para los formatos sin transparencia eliges el color de fondo. Se respeta la orientación EXIF y se eliminan metadatos como la ubicación GPS, para que la foto no revele dónde se tomó.'
				] },
				{ h2: 'Privado por diseño', body: [
					'La conversión se ejecuta en Web Workers dentro del navegador, en paralelo. Nada se envía a un servidor, así que es seguro para documentos confidenciales y no hay colas ni límites diarios.'
				] }
			],
			steps: [
				'Arrastra las imágenes al conversor o toca para elegirlas; puedes mezclar formatos.',
				'Elige el formato de salida y, si hace falta, calidad, tamaño objetivo o redimensionado.',
				'Convierte y descarga cada archivo, un ZIP con todo o guárdalo directamente en una carpeta (Chrome y Edge).'
			],
			faq: [
				{ q: '¿Qué formato elijo para un sitio web?', a: 'WebP para archivos livianos con amplio soporte, AVIF para los archivos más pequeños en navegadores modernos y PNG para gráficos que deben verse perfectos píxel a píxel.' },
				{ q: '¿Puedo convertir fotos HEIC del iPhone?', a: 'Sí. HEIC y HEIF se leen directamente en el navegador y pueden pasar a JPG, PNG, WebP o PDF, sin la ubicación.' },
				{ q: '¿Mis imágenes se suben?', a: 'No. Todo se procesa localmente en el navegador; los archivos no salen de tu dispositivo.' },
				{ q: '¿Hay un límite de archivos?', a: 'No hay un límite fijo. Los archivos se convierten en paralelo y el límite práctico es la memoria del dispositivo.' }
			]
		},
		editor: {
			label: 'Editor de imágenes online',
			title: 'Editor de imágenes online con capas, gratis',
			description: 'Editor de fotos online gratis inspirado en Paint.NET: capas, modos de fusión, varita mágica, quitar fondo con IA, 39 filtros y texto 3D. Sin subir nada.',
			h1: 'Editor de imágenes online con capas',
			lead: 'Un editor de imágenes completo en el navegador, inspirado en Paint.NET: capas, selecciones, filtros, texto y formas, además de IA local para seleccionar objetos. No se sube nada.',
			sections: [
				{ h2: 'Capas y selecciones', body: [
					'Trabaja con capas, opacidad y modos de fusión, y combina o aplana al terminar. Selecciona con rectángulo, elipse y lazo, sumando, restando o intersecando.',
					'La varita mágica ofrece cinco algoritmos, desde el relleno contiguo clásico hasta modos que respetan bordes y agrupan colores, para selecciones limpias en imágenes difíciles.'
				] },
				{ h2: 'Filtros, texto y efectos', body: [
					'39 filtros con vista previa en vivo: ajustes de color, desenfoques, nitidez, ruido, estilizar, distorsionar y artísticos. Agrega texto con extrusión 3D, brillo neón, sombra y contorno, y formas vectoriales editables.'
				] },
				{ h2: 'IA local y exportación', body: [
					'La selección inteligente y la eliminación de fondo usan modelos de IA que se descargan una vez y se ejecutan en tu dispositivo. Exporta PNG, JPG, WebP, AVIF, ICO, PSD con capas o SVG vectorial. En el celular funciona con gestos táctiles y zoom con pellizco.'
				] }
			],
			steps: [
				'Abre una imagen (arrástrala, pégala con Ctrl+V o elige el archivo); el PSD se abre con sus capas.',
				'Edita con capas, selecciones, filtros, texto y formas.',
				'Exporta al formato que necesites, incluido PSD con capas y SVG vectorial.'
			],
			faq: [
				{ q: '¿Tengo que instalar algo?', a: 'No. El editor funciona en cualquier navegador moderno, en la computadora o en el celular.' },
				{ q: '¿Abre archivos de Photoshop?', a: 'Sí. Los PSD se abren con sus capas y se pueden exportar de nuevo a PSD con capas.' },
				{ q: '¿Mis imágenes se suben?', a: 'No. La edición, los filtros y hasta las funciones de IA se ejecutan en tu dispositivo.' },
				{ q: '¿Funciona en el celular?', a: 'Sí. La interfaz se adapta al tacto, con barra de herramientas inferior y zoom con dos dedos.' }
			]
		},
		'remove-bg': {
			label: 'Quitar fondo de imagen',
			title: 'Quitar fondo de imagen gratis con IA local',
			description: 'Quita el fondo de tus fotos con IA que se ejecuta en tu dispositivo. Sin subir archivos, sin registro y sin marca de agua. Exporta en PNG transparente.',
			h1: 'Quitar el fondo de una imagen con IA en tu dispositivo',
			lead: 'Recorta personas, productos y objetos automáticamente. El modelo de IA se descarga una vez y se ejecuta en el navegador, así que tu foto no sale del dispositivo.',
			sections: [
				{ h2: 'Cómo funciona', body: [
					'Un modelo de segmentación detecta el objeto principal y convierte el fondo en transparencia. La primera vez se descarga el modelo, que queda guardado en el navegador para las siguientes.',
					'Usa WebGPU cuando está disponible y WebAssembly como alternativa, así que funciona en la mayoría de las computadoras y celulares recientes, solo que más rápido en unos que en otros.'
				] },
				{ h2: 'Ajusta y exporta', body: [
					'El resultado se abre en el editor completo: corrige bordes con el borrador o el pincel, afina con la varita mágica o la selección inteligente, pon un nuevo color o imagen de fondo y exporta en PNG o WebP transparente.'
				] }
			],
			steps: [
				'Abre la foto en el editor (arrástrala, pégala o elige el archivo).',
				'Ejecuta la eliminación de fondo; el modelo se descarga una vez y se ejecuta localmente.',
				'Retoca los bordes si hace falta y exporta en PNG o WebP transparente.'
			],
			faq: [
				{ q: '¿Mi foto se envía a un servidor?', a: 'No. A diferencia de la mayoría de los removedores de fondo, la IA se ejecuta en tu dispositivo; solo se descargan los archivos del modelo.' },
				{ q: '¿Por qué la primera vez es más lenta?', a: 'El modelo se descarga en el primer uso. Después queda guardado en el navegador y arranca mucho más rápido.' },
				{ q: '¿Hay marca de agua o límite de resolución?', a: 'Sin marca de agua y sin plan de pago para HD. Las imágenes grandes solo tardan más en dispositivos lentos.' }
			]
		},
		compress: {
			label: 'Comprimir imagen',
			title: 'Comprimir imagen a KB online, gratis y sin subir',
			description: 'Comprime imágenes JPG, PNG, WebP y AVIF hasta un tamaño objetivo en KB, en el navegador. Compresión por lotes, sin subir archivos y sin metadatos.',
			h1: 'Comprimir imágenes al tamaño que necesitas',
			lead: 'Reduce fotos para formularios, correo y sitios web sin enviarlas a ningún lado. Define un tamaño objetivo en KB o un nivel de calidad y comprime muchas imágenes a la vez.',
			sections: [
				{ h2: 'Llega al tamaño exacto en KB', body: [
					'Muchos portales solo aceptan archivos de menos de 100 KB, 200 KB o 1 MB. Escribe el límite y el compresor busca la mayor calidad que queda por debajo.',
					'Si la imagen sigue siendo demasiado grande con una calidad razonable, reduce también sus dimensiones: bajar ancho y alto a la mitad divide los píxeles entre cuatro.'
				] },
				{ h2: 'Elige el formato correcto', body: [
					'WebP y AVIF generan archivos mucho más pequeños que JPG con la misma calidad visual. Quédate con JPG cuando el destino no acepte formatos modernos. PNG es sin pérdida, así que casi no reduce las fotos.',
					'Se eliminan metadatos como el modelo de cámara y la ubicación GPS, lo que ahorra algunos KB y protege tu privacidad.'
				] }
			],
			steps: [
				'Agrega tus imágenes al compresor; puede ser un lote.',
				'Define el tamaño objetivo en KB o ajusta la calidad y elige el formato de salida.',
				'Comprime y descarga una por una, en un ZIP o en una carpeta.'
			],
			faq: [
				{ q: '¿Comprimir arruina la calidad?', a: 'Con ajustes moderados la diferencia apenas se nota. El compresor mantiene la mayor calidad que entra en el tamaño objetivo.' },
				{ q: '¿Puedo comprimir un PNG sin cambiar el formato?', a: 'PNG es sin pérdida, así que el ahorro es limitado. Para reducir mucho, conviértelo a WebP, que también conserva la transparencia.' },
				{ q: '¿Mis imágenes se suben?', a: 'No. La compresión se ejecuta en el navegador; los archivos no salen de tu dispositivo.' }
			]
		},
		resize: {
			label: 'Redimensionar imagen',
			title: 'Redimensionar imagen online gratis y por lotes',
			description: 'Redimensiona imágenes por porcentaje, para que quepan en un recuadro o a píxeles exactos, en el navegador. Por lotes, para JPG, PNG, WebP, HEIC y más.',
			h1: 'Redimensionar imágenes online',
			lead: 'Cambia las dimensiones de una imagen o de cien a la vez. Elige un porcentaje, un recuadro máximo o un ancho y alto exactos, y convierte el formato en el mismo paso.',
			sections: [
				{ h2: 'Tres formas de redimensionar', body: [
					'Porcentaje escala todo por igual, por ejemplo 50 % para la mitad del tamaño. Ajustar a un recuadro mantiene la proporción dentro de un ancho y alto máximos, ideal para lotes de fotos variadas. Exacto fija las dimensiones en píxeles.',
					'Primero se aplica la orientación EXIF, así que las fotos verticales mantienen la forma correcta.'
				] },
				{ h2: 'Redimensiona y convierte a la vez', body: [
					'Combina el redimensionado con cualquier formato de salida y calidad: por ejemplo, convierte fotos HEIC del iPhone en JPG de 1600 px y menos de 300 KB en una sola pasada.'
				] }
			],
			steps: [
				'Agrega las imágenes que quieres redimensionar.',
				'Elige porcentaje, ajustar a un recuadro o píxeles exactos, además del formato de salida.',
				'Convierte y descarga las imágenes redimensionadas, en un ZIP si prefieres.'
			],
			faq: [
				{ q: '¿Redimensionar mantiene la proporción?', a: 'Porcentaje y recuadro siempre la mantienen. En tamaño exacto defines las dos dimensiones libremente.' },
				{ q: '¿Puedo agrandar imágenes?', a: 'Sí, pero ampliar una foto no crea detalle real; la excepción es el SVG, que se mantiene nítido.' },
				{ q: '¿Las imágenes se suben?', a: 'No. El redimensionado ocurre en el navegador.' }
			]
		}
	}
};
