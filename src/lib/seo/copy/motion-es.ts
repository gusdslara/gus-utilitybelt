// Textos em espanhol das páginas de SEO do app Motion (visualizador, editor e criador de Lottie).
import type { MotionCopy } from './types.ts';

export const motionEs: MotionCopy = {
	pages: {
		'lottie-viewer': {
			label: 'Visor de Lottie',
			title: 'Visor de Lottie Online — Abre JSON y .lottie',
			description: 'Abre archivos Lottie JSON y dotLottie en el navegador: reproduce, pausa, avanza fotograma a fotograma, cambia velocidad y fondo, y consulta fps y capas.',
			h1: 'Visor y reproductor de Lottie online',
			lead: 'Arrastra un .json de Bodymovin/Lottie o un archivo .lottie y empieza a reproducirse al instante. Revisa cada fotograma, pruébalo sobre fondo claro y oscuro y consulta sus datos técnicos antes de llevarlo a tu app o web.',
			sections: [
				{ h2: 'Qué hace el visor de Lottie', body: [
					'Lottie es el formato de animación vectorial que se exporta desde After Effects con el plugin Bodymovin, y dotLottie (.lottie) es su versión comprimida, con imágenes y varias animaciones en un solo archivo. El visor reproduce ambos sin instalar nada.',
					'Es la forma más rápida de resolver las dudas antes de publicar: ¿abre bien el archivo?, ¿cuánto dura?, ¿cuánto pesa?, ¿se ve bien sobre el fondo donde va a estar?'
				] },
				{ h2: 'Cómo funciona el reproductor', body: [
					'Reproduce, pausa y arrastra la línea de tiempo para recorrerla fotograma a fotograma, o avanza de uno en uno. Cambia la velocidad, activa o desactiva el bucle y alterna el fondo entre transparente, blanco, negro o cualquier color.',
					'El panel de información muestra el tamaño del lienzo, los fotogramas por segundo, el total de fotogramas, la duración y la lista de capas, incluidas las precomposiciones, para detectar rápido lo pesado o lo oculto.'
				] }
			],
			steps: [
				'Arrastra un archivo .json o .lottie a la página, o tócala para elegirlo.',
				'Reproduce, pausa o arrastra la línea de tiempo para ver cualquier fotograma.',
				'Prueba distintas velocidades, el bucle y varios fondos.',
				'Revisa tamaño, fps, fotogramas, duración y capas en el panel de información.',
				'Si quieres, edítalo o expórtalo como GIF, MP4, WebM o dotLottie.'
			],
			faq: [
				{ q: '¿Por qué mi Lottie se ve distinto que en After Effects?', a: 'Lottie solo admite parte de lo que hace After Effects. Los efectos, algunos modos de fusión, las capas 3D y las expresiones no se exportan o los reproductores los ignoran, así que lo que ves aquí se parece a lo que mostrarán los reproductores web y móviles.' },
				{ q: '¿Puedo ver qué capas hacen pesado el archivo?', a: 'Sí. La lista muestra todas las capas y precomposiciones, y las imágenes incrustadas suelen ser las culpables cuando un Lottie pesa cientos de kilobytes.' }
			]
		},
		'lottie-editor': {
			label: 'Editor de Lottie',
			title: 'Editor de Lottie Online — Colores, Textos y Capas',
			description: 'Edita animaciones Lottie online: cambia los colores del archivo, reescribe textos, oculta o elimina capas, recorta fotogramas y cambia velocidad y lienzo.',
			h1: 'Editor de Lottie online',
			lead: 'Ajusta una animación Lottie sin abrir After Effects. Cambia los colores a los de tu marca, corrige un texto, quita una capa que sobra y exporta un nuevo JSON o .lottie en un minuto.',
			sections: [
				{ h2: 'Edita Lottie sin After Effects', body: [
					'La mayoría de los Lottie vienen de un diseñador o de una biblioteca, y los cambios pequeños suelen obligar a volver al proyecto original. Este editor trabaja directamente sobre el JSON exportado, así que puedes hacer tú mismo los ajustes habituales.',
					'Cada cambio se aplica a los datos de la animación, no a un vídeo: el resultado sigue siendo un Lottie vectorial, ligero y nítido, que puedes volver a editar más tarde.'
				] },
				{ h2: 'Colores, textos y capas', body: [
					'El editor extrae la paleta usada en el archivo. Cambia un color y todas las formas que lo usan se actualizan a la vez, ideal para aplicar los colores de marca o crear una variante para modo oscuro.',
					'Las capas de texto se pueden reescribir en el sitio, y cualquier capa o precomposición se puede ocultar o eliminar. ¿Te equivocaste? Deshacer vuelve atrás paso a paso.'
				] }
			],
			steps: [
				'Abre tu archivo .json o .lottie en el editor.',
				'Elige un color de la paleta extraída y sustitúyelo en todo el archivo.',
				'Reescribe textos y oculta o elimina las capas que no necesites.',
				'Ajusta velocidad y fps, recorta el rango de fotogramas o redimensiona el lienzo.',
				'Exporta como Lottie JSON, dotLottie, GIF o vídeo.'
			],
			faq: [
				{ q: '¿Puedo cambiar el color de un solo elemento?', a: 'La paleta cambia un color en todos los sitios donde aparece. Para recolorear un solo elemento, oculta los demás o edita esa capa en la línea de tiempo del creador.' },
				{ q: '¿El archivo editado sigue siendo un Lottie normal?', a: 'Sí. Se exporta como Lottie JSON o dotLottie estándar, compatible con lottie-web, lottie-ios, lottie-android, los reproductores dotLottie y LottieFiles.' }
			]
		},
		'lottie-maker': {
			label: 'Crear animación Lottie',
			title: 'Crear Animación Lottie Online — Gratis y sin Registro',
			description: 'Crea animaciones Lottie en el navegador con línea de tiempo, keyframes, easing, formas, texto y más de 30 presets. Exporta JSON, .lottie, GIF o MP4. Gratis.',
			h1: 'Crea animaciones Lottie online',
			lead: 'Un editor de motion en el navegador para iconos, logos, loaders y clips para redes. Construye con una línea de tiempo con keyframes o parte de un preset o una plantilla y exporta un Lottie de verdad o un vídeo.',
			sections: [
				{ h2: 'Un editor de motion pensado para Lottie', body: [
					'Añade capas de forma (rectángulo, elipse, estrella, polígono o trazados de tu propio SVG), capas de texto e imágenes, y anima posición, escala, rotación, opacidad y colores en una línea de tiempo con keyframes.',
					'Cada keyframe tiene su easing: lineal, ease in, ease out, ease in-out, back, elástico, rebote o hold. Eso es lo que hace que el movimiento se sienta natural y no robótico.'
				] },
				{ h2: 'Presets y plantillas', body: [
					'Más de 30 presets de un clic cubren los clásicos: fundido, deslizamiento, pop, zoom, giro, rebote, trazo dibujado, máquina de escribir, pulso, sacudida, wiggle, latido y bucles continuos.',
					'Las plantillas de inicio te dan una base terminada para adaptar: revelado de logo, rótulo inferior, spinner de carga, corazón de me gusta, insignia de notificación y texto de máquina de escribir.'
				] }
			],
			steps: [
				'Empieza con un lienzo vacío, una plantilla o un SVG importado.',
				'Añade formas, textos o imágenes como capas.',
				'Aplica un preset o define keyframes y easing en la línea de tiempo.',
				'Revisa el bucle en la vista previa y ajusta los tiempos.',
				'Exporta como Lottie JSON, dotLottie, GIF, MP4, WebM o PNG.'
			],
			faq: [
				{ q: '¿Necesito saber After Effects?', a: 'No. Los presets y las plantillas generan una animación completa con un clic, y la línea de tiempo usa las mismas ideas de keyframe y easing que cualquier herramienta de motion.' },
				{ q: '¿Puedo importar mi logo?', a: 'Sí. Importa un SVG y sus trazados se convierten en capas de forma que puedes animar, recolorear y dibujar trazo a trazo.' }
			]
		},
		'lottie-to-gif': {
			label: 'Lottie a GIF',
			title: 'Convertir Lottie a GIF — GIF Transparente, sin Subir',
			description: 'Convierte animaciones Lottie JSON o .lottie a GIF en tu navegador, con fondo transparente y tamaño, fps y bucle a tu gusto. Sin subir archivos ni marca de agua.',
			h1: 'Convertir Lottie a GIF',
			lead: 'Convierte una animación Lottie en GIF para los sitios que no reproducen Lottie: correo, apps de chat, documentación, diapositivas y CMS antiguos. Mantén el fondo transparente o elige un color.',
			sections: [
				{ h2: 'Por qué convertir Lottie a GIF', body: [
					'Lottie necesita una librería de reproducción, así que no funciona en correos, mensajes de Slack o Teams, archivos README, Notion ni en la mayoría de herramientas de presentaciones. El GIF se reproduce en todas partes sin código.',
					'Convertir en local también significa que tu animación aún sin publicar no sale de tu dispositivo, algo importante en trabajos para clientes y lanzamientos.'
				] },
				{ h2: 'Cómo se genera el GIF', body: [
					'Cada fotograma del Lottie se dibuja en el navegador y se codifica en un GIF con una paleta de colores optimizada. Tú eliges el tamaño, los fotogramas por segundo, el bucle y el fondo.',
					'Con fondo transparente, el GIF conserva la transparencia de todo o nada y queda limpio sobre páginas de color. Los bordes suaves se mezclan con un color de fondo que eliges para evitar halos oscuros.'
				] }
			],
			steps: [
				'Abre el archivo .json o .lottie.',
				'Revisa la vista previa y, si hace falta, recorta fotogramas o cambia la velocidad.',
				'Abre Exportar y elige GIF (viene preseleccionado en esta página).',
				'Define tamaño, fps, bucle y fondo transparente o sólido.',
				'Exporta y descarga el GIF.'
			],
			faq: [
				{ q: '¿Por qué mi GIF pesa más que el Lottie?', a: 'Lottie guarda instrucciones vectoriales, mientras que el GIF guarda cada fotograma en píxeles con un máximo de 256 colores. Reduce el tamaño o los fps, o recorta fotogramas, para aligerarlo.' },
				{ q: '¿Puedo hacer que el GIF se reproduzca una sola vez?', a: 'Sí. Desactiva el bucle en las opciones de exportación y el GIF se detendrá en su último fotograma.' }
			]
		},
		'lottie-to-mp4': {
			label: 'Lottie a MP4',
			title: 'Convertir Lottie a MP4 — Vídeo H.264 en el Navegador',
			description: 'Convierte animaciones Lottie y dotLottie a MP4 (H.264) en tu navegador para Instagram, TikTok, Reels y presentaciones. Elige tamaño, fps y color de fondo.',
			h1: 'Convertir Lottie a vídeo MP4',
			lead: 'Exporta cualquier Lottie como un vídeo MP4 que aceptan todos los móviles, redes sociales y editores de vídeo. Ideal para historias, reels, presentaciones y montaje.',
			sections: [
				{ h2: 'Por qué pasar un Lottie a MP4', body: [
					'Las redes sociales, las apps de mensajería y los editores de vídeo aceptan archivos de vídeo, no JSON de Lottie. El MP4 con H.264 es el formato de vídeo más compatible que existe, de Instagram y TikTok a PowerPoint, Keynote y Premiere.',
					'Además, el vídeo pesa menos que el GIF en animaciones largas o con mucho color, con millones de colores y degradados suaves en lugar de una paleta de 256.'
				] },
				{ h2: 'Cómo se codifica el MP4', body: [
					'Los fotogramas se renderizan a partir del Lottie y se codifican en H.264 con WebCodecs, el codificador de vídeo integrado en los navegadores modernos. Es rápido, suele usar aceleración por hardware y nada se envía a un servidor.',
					'Elige resolución, fotogramas por segundo y color de fondo, ya que el MP4 no admite transparencia. Para una historia vertical, redimensiona el lienzo a 1080×1920 antes de exportar.'
				] }
			],
			steps: [
				'Abre tu archivo Lottie .json o .lottie.',
				'Redimensiona el lienzo si necesitas un vídeo cuadrado, vertical o panorámico.',
				'Abre Exportar; el MP4 viene preseleccionado en esta página.',
				'Elige resolución, fps y color de fondo.',
				'Exporta y descarga el MP4.'
			],
			faq: [
				{ q: '¿Puedo exportar un vídeo vertical para Historias y Reels?', a: 'Sí. Redimensiona el lienzo a 1080×1920 (9:16), coloca la animación y exporta en MP4.' },
				{ q: '¿El MP4 tiene sonido?', a: 'No. Las animaciones Lottie no tienen pista de audio, así que el vídeo sale sin sonido. Añade la música después en tu editor de vídeo o en la red social.' }
			]
		},
		'lottie-to-webm': {
			label: 'Lottie a WebM',
			title: 'Convertir Lottie a WebM — Gratis, en el Navegador',
			description: 'Convierte archivos Lottie JSON y .lottie a vídeo WebM en el navegador. Archivos ligeros para webs y bucles automáticos, con tamaño y fps a elegir. Sin subidas.',
			h1: 'Convertir Lottie a WebM',
			lead: 'Exporta un Lottie como vídeo WebM, el formato de vídeo abierto de la web que los navegadores reproducen de forma nativa en una etiqueta video silenciada y en bucle, sin librería de Lottie.',
			sections: [
				{ h2: 'Cuándo conviene WebM', body: [
					'Si quieres una animación en tu web pero no cargar un reproductor de Lottie, un WebM corto y silenciado en una etiqueta video con autoplay y loop es ligero, fluido y compatible con todos los navegadores modernos.',
					'WebM usa los códecs VP8/VP9 y suele dar archivos más pequeños que el GIF con colores mucho mejores, lo que ayuda a la velocidad de carga y a las Core Web Vitals.'
				] },
				{ h2: 'Cómo funciona la exportación a WebM', body: [
					'El Lottie se renderiza fotograma a fotograma en tu navegador y se codifica en local. Eliges tamaño de salida, fotogramas por segundo y fondo, y descargas el archivo .webm.',
					'Para llegar a todo el mundo, publica el WebM junto con un MP4 de respaldo: las versiones antiguas de Safari y muchas apps de escritorio prefieren MP4.'
				] }
			],
			steps: [
				'Abre el archivo Lottie .json o .lottie.',
				'Recorta fotogramas o cambia la velocidad si el bucle es largo.',
				'Abre Exportar; el WebM viene preseleccionado en esta página.',
				'Elige tamaño, fps y fondo.',
				'Exporta y usa el .webm en una etiqueta video silenciada y en bucle.'
			],
			faq: [
				{ q: '¿WebM se reproduce en iPhone?', a: 'Las versiones recientes de Safari reproducen WebM, pero los iPhone y iPad más antiguos no. Ofrece un MP4 de respaldo en la misma etiqueta video por seguridad.' },
				{ q: '¿WebM o Lottie para mi web?', a: 'Lottie se ve nítido a cualquier tamaño y puede ser interactivo, pero necesita un script de reproducción. WebM no necesita script y va mejor en escenas complejas y con mucho color.' }
			]
		},
		'json-to-lottie': {
			label: 'JSON a dotLottie',
			title: 'Convertir JSON a Lottie (.lottie) Online',
			description: 'Convierte Lottie JSON (Bodymovin) en un archivo dotLottie (.lottie) compacto en tu navegador, o extrae un .lottie de nuevo a JSON. Gratis y sin registro.',
			h1: 'Convertir Lottie JSON a dotLottie',
			lead: 'Empaqueta un JSON de Bodymovin y sus imágenes en un único archivo .lottie comprimido, o abre un .lottie y guárdalo otra vez como JSON. Todo ocurre en tu navegador.',
			sections: [
				{ h2: 'JSON frente a dotLottie', body: [
					'Un Lottie JSON es texto plano: fácil de inspeccionar y compatible con todos los reproductores, pero las imágenes tienen que ir incrustadas en base64 o en archivos aparte. dotLottie (.lottie) es un ZIP con el JSON, sus imágenes y un manifiesto.',
					'Gracias a la compresión, un .lottie suele ocupar entre un 50 % y un 80 % menos que el mismo JSON, y lo mantiene todo en un solo archivo fácil de compartir y de cachear.'
				] },
				{ h2: 'Cómo funciona la conversión', body: [
					'Abre el JSON y exporta como dotLottie: los datos de la animación y los recursos se empaquetan y comprimen en local. En sentido inverso, abre un .lottie y exporta Lottie JSON para recuperar los datos originales.',
					'También puedes ajustar la animación antes de guardar: cambia colores, textos, velocidad o tamaño del lienzo en el editor y exporta en el formato que necesites.'
				] }
			],
			steps: [
				'Suelta tu Lottie .json (o un .lottie para extraerlo).',
				'Revisa la vista previa y edita lo que haga falta.',
				'Abre Exportar; dotLottie viene preseleccionado en esta página.',
				'Elige dotLottie para empaquetar o Lottie JSON para extraer.',
				'Descarga el archivo convertido.'
			],
			faq: [
				{ q: '¿Todos los reproductores admiten .lottie?', a: 'Los reproductores dotLottie (web, iOS, Android, React, Flutter) y LottieFiles sí. Los proyectos antiguos que solo usan lottie-web necesitan el JSON plano, que también puedes exportar aquí.' },
				{ q: '¿La conversión cambia la animación?', a: 'No. Empaquetar en dotLottie solo comprime los mismos datos y recursos, así que la reproducción es idéntica.' }
			]
		},
		'text-animation': {
			label: 'Animar texto',
			title: 'Animar Texto Online — Máquina de Escribir y Más',
			description: 'Crea texto animado online: máquina de escribir, fundido, deslizamiento y escala letra a letra, con easing y bucle. Exporta a Lottie, GIF, MP4 o WebM. Gratis.',
			h1: 'Animar texto online',
			lead: 'Convierte una palabra, un título o una cita en movimiento. Anima el texto letra a letra, elige el easing y exporta un Lottie ligero para tu web o un vídeo para redes.',
			sections: [
				{ h2: 'Animación de texto letra a letra', body: [
					'Escribe tu texto y elige cómo aparece cada carácter: máquina de escribir, fundido, deslizamiento desde cualquier lado o escala. Un retardo entre letras da el clásico efecto escalonado de títulos e intros.',
					'Combínalo con la línea de tiempo: deja el texto quieto un momento y anima la salida de toda la línea, o haz un bucle para un banner. Easings como back y elástico añaden un rebote divertido.'
				] },
				{ h2: 'Ideas para texto animado', body: [
					'Úsalo en títulos de historias, rótulos inferiores de YouTube, titulares de la portada de tu web, aperturas de presentaciones, citas en Instagram o un efecto de máquina de escribir en una demo de producto.',
					'Parte de las plantillas de texto de máquina de escribir o de rótulo inferior y cambia las palabras, o crea el tuyo desde cero con capas de texto y formas.'
				] }
			],
			steps: [
				'Abre el animador de texto o una plantilla de texto.',
				'Escribe el texto y elige tamaño, color y alineación.',
				'Elige la animación por letra: máquina de escribir, fundido, deslizamiento o escala.',
				'Ajusta tiempos y easing en la línea de tiempo.',
				'Exporta a Lottie, GIF, MP4 o WebM.'
			],
			faq: [
				{ q: '¿Puedo animar palabra por palabra?', a: 'Los presets funcionan por carácter. Para animar palabra por palabra, pon cada palabra en su propia capa de texto y desplaza sus keyframes en la línea de tiempo.' },
				{ q: '¿El texto sigue siendo editable tras exportar?', a: 'En Lottie JSON y dotLottie el texto sigue siendo texto, así que puedes reabrirlo y cambiarlo. En GIF y vídeo se convierte en píxeles.' }
			]
		}
	},
	sections: {
		edit: { h2: 'Qué puedes cambiar', body: [
			'Cambia los colores de toda la animación desde su paleta extraída, reescribe textos, oculta o elimina capas y precomposiciones, cambia la velocidad o los fps, recorta el rango de fotogramas y redimensiona el lienzo. Todo se puede deshacer.',
			'Para cambios mayores, abre el creador: línea de tiempo con keyframes y easing, capas de forma, texto e imagen y más de 30 presets de animación.'
		] },
		export: { h2: 'Formatos de exportación y usos', body: [
			'Exporta Lottie JSON o dotLottie para webs y apps, GIF con transparencia para correo y chats, MP4 (H.264) para Instagram, TikTok, historias y presentaciones, WebM para bucles ligeros en la web, una secuencia PNG en ZIP o un fotograma suelto en PNG o SVG.',
			'La misma animación puede servir para la página de un producto, una pantalla de bienvenida en una app móvil, una publicación en redes y una diapositiva, cada una en el formato adecuado.'
		] },
		tips: { h2: 'Consejos de rendimiento y peso', body: [
			'Las imágenes incrustadas suelen ser lo más pesado de un Lottie: usa formas vectoriales siempre que puedas, o dotLottie para comprimir los recursos. Menos capas y bucles más cortos también van más fluidos en móviles modestos.',
			'En GIF, reduce primero las dimensiones y los fps: pasar de 60 a 30 fps reduce el archivo casi a la mitad. En vídeo, 30 fps y el tamaño real de visualización bastan para la mayoría de usos en redes y en la web.'
		] },
		choose: { h2: 'GIF, MP4 o Lottie: cuál usar', body: [
			'Lottie (JSON o .lottie) es la mejor opción dentro de webs y apps: diminuto, nítido a cualquier tamaño y controlable por código. El GIF es para sitios que solo muestran imágenes, como el correo y los chats, y es el único de los tres con transparencia que funciona en todas partes.',
			'El MP4 es para redes sociales, mensajería y presentaciones: millones de colores, archivos pequeños y sin transparencia. WebM es la opción de vídeo ligera para páginas web.'
		] }
	},
	faq: {
		dotlottie: { q: '¿Admite archivos .lottie (dotLottie)?', a: 'Sí. Abre tanto archivos .json de Bodymovin/Lottie como .lottie de dotLottie, y exporta en ambos formatos.' },
		expressions: { q: '¿Funcionan las expresiones de After Effects?', a: 'No. Las expresiones no se evalúan, como en la mayoría de reproductores de Lottie; se usan sus valores estáticos. Los efectos, las capas 3D y algunos modos de fusión tampoco forman parte de Lottie.' },
		fonts: { q: '¿Qué fuentes usan las capas de texto?', a: 'Las capas de texto se dibujan con las fuentes instaladas en tu sistema. Si falta la fuente original se usa una parecida, así que convierte los textos importantes en formas antes de exportar.' },
		gifAlpha: { q: '¿El GIF puede tener fondo transparente?', a: 'Sí. Elige fondo transparente al exportar. La transparencia del GIF es de todo o nada por píxel, así que los bordes suaves se mezclan con un color de fondo que eliges.' },
		webcodecs: { q: '¿Por qué exportar a MP4 requiere un navegador moderno?', a: 'El MP4 se codifica con WebCodecs, disponible en las versiones actuales de Chrome, Edge, Safari y Firefox. En navegadores antiguos, exporta WebM, GIF o una secuencia PNG.' },
		privacy: { q: '¿Se suben mis animaciones a algún servidor?', a: 'No. Abrir, editar, renderizar y codificar ocurre en tu navegador. Los archivos no salen de tu dispositivo, así que es seguro para trabajos aún no publicados.' },
		phone: { q: '¿Funciona en el móvil?', a: 'Sí. Puedes abrir, reproducir, editar y exportar animaciones Lottie en iPhone y Android con cualquier navegador moderno.' },
		free: { q: '¿Es gratis? ¿Tiene marca de agua?', a: 'Es totalmente gratis, sin registro, sin marca de agua y sin límite de exportaciones.' }
	}
};
