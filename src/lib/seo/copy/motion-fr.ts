// Textos em francês das páginas de SEO do app Motion (visualizador, editor e criador de Lottie).
// Os espaços antes de : ; ? ! viram espaço fino inseparável em polish() (../pages.ts).
import type { MotionCopy } from './types.ts';

export const motionFr: MotionCopy = {
	pages: {
		'lottie-viewer': {
			label: 'Visionneuse Lottie',
			title: 'Visionneuse Lottie en ligne — JSON et .lottie',
			description: 'Ouvrez vos fichiers Lottie JSON et dotLottie dans le navigateur : lecture, pause, image par image, vitesse, fond, et infos sur fps, images et calques.',
			h1: 'Visionneuse et lecteur Lottie en ligne',
			lead: 'Glissez un .json Bodymovin/Lottie ou un fichier .lottie et la lecture démarre aussitôt. Vérifiez chaque image, testez-la sur fond clair ou sombre et consultez ses caractéristiques avant de l’intégrer à votre app ou à votre site.',
			sections: [
				{ h2: 'Ce que fait la visionneuse Lottie', body: [
					'Lottie est le format d’animation vectorielle exporté depuis After Effects avec le plugin Bodymovin, et dotLottie (.lottie) en est la version compressée, avec images et plusieurs animations dans un seul fichier. La visionneuse lit les deux sans rien installer.',
					'C’est le moyen le plus rapide de répondre aux questions avant la mise en ligne : le fichier s’ouvre-t-il, combien dure-t-il, combien pèse-t-il et rend-il bien sur le fond prévu ?'
				] },
				{ h2: 'Comment fonctionne le lecteur', body: [
					'Lancez, mettez en pause et faites glisser la timeline pour parcourir l’animation image par image, ou avancez d’une image à la fois. Changez la vitesse, activez ou non la boucle et passez d’un fond transparent à blanc, noir ou à la couleur de votre choix.',
					'Le panneau d’informations affiche la taille du canevas, la cadence, le nombre d’images, la durée et la liste des calques, précompositions comprises, pour repérer vite ce qui est lourd ou masqué.'
				] }
			],
			steps: [
				'Glissez un fichier .json ou .lottie sur la page, ou touchez-la pour le choisir.',
				'Lancez, mettez en pause ou faites glisser la timeline pour voir n’importe quelle image.',
				'Essayez différentes vitesses, la boucle et plusieurs fonds.',
				'Vérifiez taille, fps, images, durée et calques dans le panneau d’informations.',
				'Si besoin, modifiez-la ou exportez-la en GIF, MP4, WebM ou dotLottie.'
			],
			faq: [
				{ q: 'Pourquoi mon Lottie est-il différent de ce que montre After Effects ?', a: 'Lottie ne prend en charge qu’une partie d’After Effects. Les effets, certains modes de fusion, les calques 3D et les expressions ne sont pas exportés ou sont ignorés par les lecteurs : ce que vous voyez ici est proche du rendu des lecteurs web et mobiles.' },
				{ q: 'Puis-je voir quels calques alourdissent le fichier ?', a: 'Oui. La liste montre tous les calques et précompositions, et les images intégrées sont souvent en cause quand un Lottie pèse des centaines de kilo-octets.' }
			]
		},
		'lottie-editor': {
			label: 'Éditeur Lottie',
			title: 'Éditeur Lottie en ligne — Couleurs, textes et calques',
			description: 'Modifiez vos animations Lottie en ligne : couleurs de tout le fichier, textes, calques masqués ou supprimés, images coupées, vitesse et canevas redimensionné.',
			h1: 'Éditeur Lottie en ligne',
			lead: 'Ajustez une animation Lottie sans ouvrir After Effects. Passez-la aux couleurs de votre marque, corrigez un texte, retirez un calque inutile et exportez un nouveau JSON ou .lottie en une minute.',
			sections: [
				{ h2: 'Modifier un Lottie sans After Effects', body: [
					'La plupart des Lottie viennent d’un designer ou d’une bibliothèque, et la moindre retouche oblige souvent à rouvrir le projet d’origine. Cet éditeur travaille directement sur le JSON exporté : vous faites vous-même les corrections courantes.',
					'Chaque modification porte sur les données de l’animation, pas sur une vidéo : le résultat reste un Lottie vectoriel, léger et net, que vous pourrez modifier à nouveau plus tard.'
				] },
				{ h2: 'Couleurs, textes et calques', body: [
					'L’éditeur extrait la palette utilisée dans le fichier. Changez une teinte et toutes les formes qui l’utilisent se mettent à jour, idéal pour appliquer une charte graphique ou créer une variante pour le mode sombre.',
					'Les calques de texte se réécrivent sur place, et tout calque ou précomposition peut être masqué ou supprimé. Une erreur ? L’annulation revient en arrière pas à pas.'
				] }
			],
			steps: [
				'Ouvrez votre fichier .json ou .lottie dans l’éditeur.',
				'Choisissez une couleur de la palette extraite et remplacez-la partout.',
				'Réécrivez les textes et masquez ou supprimez les calques inutiles.',
				'Ajustez vitesse et fps, coupez la plage d’images ou redimensionnez le canevas.',
				'Exportez en Lottie JSON, dotLottie, GIF ou vidéo.'
			],
			faq: [
				{ q: 'Puis-je changer la couleur d’un seul élément ?', a: 'La palette remplace une couleur partout où elle apparaît. Pour recolorer un seul élément, masquez les autres ou modifiez ce calque dans la timeline du créateur.' },
				{ q: 'Le fichier modifié reste-t-il un Lottie standard ?', a: 'Oui. L’export est un Lottie JSON ou un dotLottie standard, compatible avec lottie-web, lottie-ios, lottie-android, les lecteurs dotLottie et LottieFiles.' }
			]
		},
		'lottie-maker': {
			label: 'Créateur d’animation Lottie',
			title: 'Créer une animation Lottie en ligne — Gratuit',
			description: 'Créez des animations Lottie dans le navigateur : timeline, keyframes, easing, formes, texte et plus de 30 presets. Export JSON, .lottie, GIF ou MP4. Gratuit.',
			h1: 'Créez des animations Lottie en ligne',
			lead: 'Un éditeur de motion design dans le navigateur pour icônes, logos, loaders et clips pour les réseaux. Travaillez sur une timeline à keyframes ou partez d’un preset ou d’un modèle, puis exportez un vrai Lottie ou une vidéo.',
			sections: [
				{ h2: 'Un éditeur de motion pensé pour Lottie', body: [
					'Ajoutez des calques de forme (rectangle, ellipse, étoile, polygone ou tracés de votre propre SVG), des calques de texte et des images, puis animez position, échelle, rotation, opacité et couleurs sur une timeline à keyframes.',
					'Chaque keyframe a son easing : linéaire, ease in, ease out, ease in-out, back, élastique, rebond ou hold. C’est ce qui rend le mouvement naturel plutôt que mécanique.'
				] },
				{ h2: 'Presets et modèles', body: [
					'Plus de 30 presets en un clic couvrent les classiques : fondu, glissement, pop, zoom, rotation, rebond, tracé dessiné, machine à écrire, pulsation, secousse, wiggle, battement de cœur et boucles continues.',
					'Des modèles de départ fournissent une base finie à adapter : révélation de logo, synthé (lower third), spinner de chargement, cœur « j’aime », badge de notification et texte machine à écrire.'
				] }
			],
			steps: [
				'Partez d’un canevas vide, d’un modèle ou d’un SVG importé.',
				'Ajoutez des formes, des textes ou des images en calques.',
				'Appliquez un preset ou placez keyframes et easing sur la timeline.',
				'Vérifiez la boucle dans l’aperçu et ajustez le timing.',
				'Exportez en Lottie JSON, dotLottie, GIF, MP4, WebM ou PNG.'
			],
			faq: [
				{ q: 'Faut-il connaître After Effects ?', a: 'Non. Les presets et modèles produisent une animation complète en un clic, et la timeline reprend les notions de keyframe et d’easing de n’importe quel outil de motion.' },
				{ q: 'Puis-je importer mon logo ?', a: 'Oui. Importez un SVG : ses tracés deviennent des calques de forme que vous pouvez animer, recolorer et dessiner trait par trait.' }
			]
		},
		'lottie-to-gif': {
			label: 'Lottie en GIF',
			title: 'Convertir Lottie en GIF — GIF transparent, sans envoi',
			description: 'Convertissez vos animations Lottie JSON ou .lottie en GIF dans le navigateur, avec fond transparent, taille, fps et boucle réglables. Sans envoi ni filigrane.',
			h1: 'Convertir un Lottie en GIF',
			lead: 'Transformez une animation Lottie en GIF pour les endroits qui ne lisent pas Lottie : e-mails, messageries, documentation, diaporamas et anciens CMS. Gardez un fond transparent ou choisissez une couleur.',
			sections: [
				{ h2: 'Pourquoi convertir un Lottie en GIF', body: [
					'Lottie nécessite une bibliothèque de lecture : il ne fonctionne donc ni dans les e-mails, ni dans les messages Slack ou Teams, ni dans les README, Notion ou la plupart des logiciels de présentation. Le GIF, lui, se lit partout sans code.',
					'La conversion locale garantit aussi que votre animation encore confidentielle ne quitte pas votre appareil, ce qui compte pour les projets clients et les lancements.'
				] },
				{ h2: 'Comment le GIF est généré', body: [
					'Chaque image du Lottie est dessinée dans le navigateur puis encodée en GIF avec une palette de couleurs optimisée. Vous choisissez la taille, la cadence, la boucle et le fond.',
					'Avec un fond transparent, le GIF conserve une transparence tout ou rien et s’affiche proprement sur des pages colorées. Les bords adoucis sont fondus avec une couleur de détourage choisie pour éviter les halos sombres.'
				] }
			],
			steps: [
				'Ouvrez le fichier .json ou .lottie.',
				'Vérifiez l’aperçu et, si besoin, coupez des images ou changez la vitesse.',
				'Ouvrez Exporter et choisissez GIF (présélectionné sur cette page).',
				'Réglez taille, fps, boucle et fond transparent ou uni.',
				'Exportez et téléchargez le GIF.'
			],
			faq: [
				{ q: 'Pourquoi mon GIF est-il plus lourd que le Lottie ?', a: 'Lottie stocke des instructions vectorielles, alors que le GIF stocke chaque image en pixels, avec 256 couleurs au maximum. Réduisez la taille ou les fps, ou coupez des images, pour l’alléger.' },
				{ q: 'Le GIF peut-il ne jouer qu’une fois ?', a: 'Oui. Désactivez la boucle dans les options d’export et le GIF s’arrêtera sur sa dernière image.' }
			]
		},
		'lottie-to-mp4': {
			label: 'Lottie en MP4',
			title: 'Convertir Lottie en MP4 — Vidéo H.264 dans le navigateur',
			description: 'Convertissez vos animations Lottie et dotLottie en MP4 (H.264) dans le navigateur pour Instagram, TikTok, Reels et vos slides. Taille, fps et fond au choix.',
			h1: 'Convertir un Lottie en vidéo MP4',
			lead: 'Exportez n’importe quel Lottie en vidéo MP4, acceptée par tous les téléphones, réseaux sociaux et logiciels de montage. Idéal pour les stories, les reels, les présentations et le montage.',
			sections: [
				{ h2: 'Pourquoi passer un Lottie en MP4', body: [
					'Les réseaux sociaux, les messageries et les logiciels de montage acceptent des vidéos, pas du JSON Lottie. Le MP4 en H.264 est le format vidéo le plus compatible qui soit, d’Instagram et TikTok à PowerPoint, Keynote et Premiere.',
					'La vidéo est aussi plus légère que le GIF pour les animations longues ou très colorées, avec des millions de couleurs et des dégradés fluides au lieu d’une palette de 256 couleurs.'
				] },
				{ h2: 'Comment le MP4 est encodé', body: [
					'Les images sont rendues à partir du Lottie puis encodées en H.264 avec WebCodecs, l’encodeur vidéo intégré aux navigateurs récents. C’est rapide, souvent accéléré par le matériel, et rien n’est envoyé à un serveur.',
					'Choisissez la résolution, la cadence et la couleur de fond, car le MP4 ne gère pas la transparence. Pour une story verticale, redimensionnez le canevas en 1080×1920 avant l’export.'
				] }
			],
			steps: [
				'Ouvrez votre fichier Lottie .json ou .lottie.',
				'Redimensionnez le canevas pour une vidéo carrée, verticale ou large.',
				'Ouvrez Exporter : le MP4 est présélectionné sur cette page.',
				'Choisissez résolution, fps et couleur de fond.',
				'Exportez et téléchargez le MP4.'
			],
			faq: [
				{ q: 'Puis-je exporter une vidéo verticale pour les Stories et Reels ?', a: 'Oui. Redimensionnez le canevas en 1080×1920 (9:16), placez l’animation et exportez en MP4.' },
				{ q: 'Le MP4 a-t-il du son ?', a: 'Non. Les animations Lottie n’ont pas de piste audio, la vidéo est donc muette. Ajoutez la musique ensuite dans votre logiciel de montage ou sur le réseau social.' }
			]
		},
		'lottie-to-webm': {
			label: 'Lottie en WebM',
			title: 'Convertir Lottie en WebM — Gratuit, dans le navigateur',
			description: 'Convertissez vos fichiers Lottie JSON et .lottie en vidéo WebM dans le navigateur. Fichiers légers pour le web et les boucles, taille et fps au choix.',
			h1: 'Convertir un Lottie en WebM',
			lead: 'Exportez un Lottie en vidéo WebM, le format vidéo ouvert du web que les navigateurs lisent nativement dans une balise video muette et en boucle, sans bibliothèque Lottie.',
			sections: [
				{ h2: 'Quand choisir le WebM', body: [
					'Si vous voulez une animation sur votre site sans charger de lecteur Lottie, un court WebM muet dans une balise video en autoplay et en boucle est léger, fluide et pris en charge par tous les navigateurs récents.',
					'Le WebM utilise les codecs VP8/VP9 et produit en général des fichiers plus légers que le GIF, avec des couleurs bien meilleures, ce qui profite à la vitesse de chargement et aux Core Web Vitals.'
				] },
				{ h2: 'Comment fonctionne l’export WebM', body: [
					'Le Lottie est rendu image par image dans votre navigateur et encodé localement. Vous choisissez la taille de sortie, la cadence et le fond, puis téléchargez le fichier .webm.',
					'Pour toucher tout le monde, publiez le WebM avec un MP4 de secours : les anciennes versions de Safari et de nombreux logiciels de bureau préfèrent le MP4.'
				] }
			],
			steps: [
				'Ouvrez le fichier Lottie .json ou .lottie.',
				'Coupez des images ou changez la vitesse si la boucle est trop longue.',
				'Ouvrez Exporter : le WebM est présélectionné sur cette page.',
				'Choisissez taille, fps et fond.',
				'Exportez et utilisez le .webm dans une balise video muette et en boucle.'
			],
			faq: [
				{ q: 'Le WebM se lit-il sur iPhone ?', a: 'Les versions récentes de Safari lisent le WebM, mais pas les iPhone et iPad plus anciens. Prévoyez un MP4 de secours dans la même balise video par sécurité.' },
				{ q: 'WebM ou Lottie pour mon site ?', a: 'Lottie reste net à toutes les tailles et peut être interactif, mais demande un script de lecture. Le WebM se passe de script et convient mieux aux scènes complexes et très colorées.' }
			]
		},
		'json-to-lottie': {
			label: 'JSON en dotLottie',
			title: 'Convertir JSON en Lottie (.lottie) en ligne',
			description: 'Convertissez un Lottie JSON (Bodymovin) en fichier dotLottie (.lottie) compact dans le navigateur, ou extrayez un .lottie en JSON. Gratuit et privé.',
			h1: 'Convertir un Lottie JSON en dotLottie',
			lead: 'Regroupez un JSON Bodymovin et ses images dans un seul fichier .lottie compressé, ou ouvrez un .lottie pour le réenregistrer en JSON. Tout se passe dans votre navigateur.',
			sections: [
				{ h2: 'JSON ou dotLottie', body: [
					'Un Lottie JSON est du texte brut : facile à inspecter et lu par tous les lecteurs, mais les images doivent être intégrées en base64 ou livrées à part. Le dotLottie (.lottie) est une archive ZIP contenant le JSON, ses images et un manifeste.',
					'Grâce à la compression, un .lottie est souvent 50 à 80 % plus léger que le même JSON, et tout tient dans un seul fichier facile à partager et à mettre en cache.'
				] },
				{ h2: 'Comment se passe la conversion', body: [
					'Ouvrez le JSON et exportez en dotLottie : les données de l’animation et les ressources sont regroupées et compressées localement. Dans l’autre sens, ouvrez un .lottie et exportez en Lottie JSON pour retrouver les données d’origine.',
					'Vous pouvez aussi retoucher l’animation avant d’enregistrer : couleurs, textes, vitesse ou taille du canevas dans l’éditeur, puis export dans le format voulu.'
				] }
			],
			steps: [
				'Déposez votre Lottie .json (ou un .lottie à extraire).',
				'Vérifiez l’aperçu et modifiez ce qui doit l’être.',
				'Ouvrez Exporter : le dotLottie est présélectionné sur cette page.',
				'Choisissez dotLottie pour compresser ou Lottie JSON pour extraire.',
				'Téléchargez le fichier converti.'
			],
			faq: [
				{ q: 'Tous les lecteurs acceptent-ils le .lottie ?', a: 'Les lecteurs dotLottie (web, iOS, Android, React, Flutter) et LottieFiles, oui. Les projets plus anciens qui n’utilisent que lottie-web ont besoin du JSON brut, que vous pouvez aussi exporter ici.' },
				{ q: 'La conversion modifie-t-elle l’animation ?', a: 'Non. Le passage en dotLottie compresse seulement les mêmes données et ressources : la lecture est identique.' }
			]
		},
		'text-animation': {
			label: 'Animer un texte',
			title: 'Animer un texte en ligne — Machine à écrire et plus',
			description: 'Créez du texte animé en ligne : machine à écrire, fondu, glissement et échelle lettre par lettre, avec easing et boucle. Export Lottie, GIF, MP4 ou WebM.',
			h1: 'Animer un texte en ligne',
			lead: 'Donnez du mouvement à un mot, un titre ou une citation. Animez le texte lettre par lettre, choisissez l’easing et exportez un Lottie léger pour votre site ou une vidéo pour les réseaux.',
			sections: [
				{ h2: 'Animation de texte lettre par lettre', body: [
					'Saisissez votre texte et choisissez comment chaque caractère apparaît : machine à écrire, fondu, glissement depuis n’importe quel côté ou mise à l’échelle. Un décalage entre les lettres donne l’effet en cascade classique des titres et génériques.',
					'Combinez avec la timeline : laissez le texte à l’écran un instant, puis animez la sortie de toute la ligne, ou bouclez-la pour une bannière. Des easings comme back ou élastique ajoutent un rebond ludique.'
				] },
				{ h2: 'Idées de textes animés', body: [
					'Utilisez-le pour des titres de stories, des synthés YouTube, l’accroche en haut de votre site, l’ouverture d’une présentation, une citation sur Instagram ou un effet machine à écrire dans une démo produit.',
					'Partez des modèles texte machine à écrire ou synthé et changez les mots, ou composez le vôtre à partir d’un canevas vide avec des calques de texte et de forme.'
				] }
			],
			steps: [
				'Ouvrez l’animateur de texte ou un modèle de texte.',
				'Saisissez le texte et choisissez taille, couleur et alignement.',
				'Choisissez l’animation par lettre : machine à écrire, fondu, glissement ou échelle.',
				'Ajustez le timing et l’easing sur la timeline.',
				'Exportez en Lottie, GIF, MP4 ou WebM.'
			],
			faq: [
				{ q: 'Puis-je animer mot par mot ?', a: 'Les presets agissent caractère par caractère. Pour une animation mot par mot, placez chaque mot sur son propre calque de texte et décalez leurs keyframes sur la timeline.' },
				{ q: 'Le texte reste-t-il modifiable après l’export ?', a: 'En Lottie JSON et dotLottie, le texte reste du texte : vous pouvez le rouvrir et le modifier. En GIF et en vidéo, il devient des pixels.' }
			]
		}
	},
	sections: {
		edit: { h2: 'Ce que vous pouvez modifier', body: [
			'Recolorez toute l’animation depuis sa palette extraite, réécrivez les textes, masquez ou supprimez calques et précompositions, changez la vitesse ou les fps, coupez la plage d’images et redimensionnez le canevas. Tout peut être annulé.',
			'Pour des changements plus importants, ouvrez le créateur : timeline à keyframes avec easing, calques de forme, de texte et d’image, et plus de 30 presets d’animation.'
		] },
		export: { h2: 'Formats d’export et usages', body: [
			'Exportez en Lottie JSON ou dotLottie pour les sites et les apps, en GIF transparent pour les e-mails et messageries, en MP4 (H.264) pour Instagram, TikTok, les stories et les présentations, en WebM pour des boucles web légères, en séquence PNG dans un ZIP, ou une seule image en PNG ou SVG.',
			'Une même animation peut servir sur une fiche produit, un écran d’onboarding d’app mobile, une publication sur les réseaux et une diapositive, chacune dans le format adapté.'
		] },
		tips: { h2: 'Conseils de performance et de poids', body: [
			'Les images intégrées sont souvent la partie la plus lourde d’un Lottie : préférez les formes vectorielles, ou utilisez le dotLottie pour compresser les ressources. Moins de calques et des boucles plus courtes tournent aussi mieux sur les téléphones modestes.',
			'Pour un GIF, réduisez d’abord les dimensions et les fps : passer de 60 à 30 fps divise le fichier presque par deux. En vidéo, 30 fps et la taille d’affichage réelle suffisent pour la plupart des usages web et réseaux.'
		] },
		choose: { h2: 'GIF, MP4 ou Lottie : lequel choisir', body: [
			'Lottie (JSON ou .lottie) est le meilleur choix dans les sites et les apps : minuscule, net à toutes les tailles et pilotable par le code. Le GIF sert là où seules les images passent, comme les e-mails et les messageries, et c’est le seul des trois dont la transparence fonctionne partout.',
			'Le MP4 est fait pour les réseaux sociaux, les messageries et les présentations : des millions de couleurs, des fichiers légers, mais pas de transparence. Le WebM est l’option vidéo légère pour les pages web.'
		] }
	},
	faq: {
		dotlottie: { q: 'Les fichiers .lottie (dotLottie) sont-ils pris en charge ?', a: 'Oui. L’outil ouvre aussi bien les .json Bodymovin/Lottie que les .lottie dotLottie, et exporte dans les deux formats.' },
		expressions: { q: 'Les expressions After Effects sont-elles prises en charge ?', a: 'Non. Les expressions ne sont pas évaluées, comme dans la plupart des lecteurs Lottie : leurs valeurs statiques sont utilisées. Les effets, les calques 3D et certains modes de fusion ne font pas non plus partie de Lottie.' },
		fonts: { q: 'Quelles polices utilisent les calques de texte ?', a: 'Les calques de texte sont dessinés avec les polices installées sur votre système. Si la police d’origine manque, une police proche la remplace : convertissez les textes importants en formes avant l’export.' },
		gifAlpha: { q: 'Le GIF peut-il avoir un fond transparent ?', a: 'Oui. Choisissez un fond transparent à l’export. La transparence du GIF est tout ou rien par pixel : les bords adoucis sont donc fondus avec une couleur de détourage que vous choisissez.' },
		webcodecs: { q: 'Pourquoi l’export MP4 demande-t-il un navigateur récent ?', a: 'Le MP4 est encodé avec WebCodecs, disponible dans les versions actuelles de Chrome, Edge, Safari et Firefox. Sur un navigateur ancien, exportez en WebM, en GIF ou en séquence PNG.' },
		privacy: { q: 'Mes animations sont-elles envoyées sur un serveur ?', a: 'Non. Ouverture, édition, rendu et encodage se font dans votre navigateur. Les fichiers ne quittent pas votre appareil : c’est sûr pour les projets encore confidentiels.' },
		phone: { q: 'Est-ce que ça marche sur mobile ?', a: 'Oui. Vous pouvez ouvrir, lire, modifier et exporter des animations Lottie sur iPhone et Android dans n’importe quel navigateur récent.' },
		free: { q: 'Est-ce gratuit ? Y a-t-il un filigrane ?', a: 'C’est entièrement gratuit, sans inscription, sans filigrane et sans limite d’export.' }
	}
};
