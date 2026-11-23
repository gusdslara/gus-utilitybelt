// Textes en français des pages SEO (convertisseur et éditeur d'images).
// Espaces insécables avant « : ; ? ! » selon la typographie française.
import type { Copy } from './types.ts';

export const fr: Copy = {
	fmt: {
		jpg: {
			full: 'JPEG (Joint Photographic Experts Group)',
			about: 'Le JPG, ou JPEG, est le format standard des photos d’appareils photo et de la plupart des smartphones. Il utilise une compression avec perte, ne gère pas la transparence et s’ouvre dans pratiquement tous les logiciels, sites et systèmes.',
			pain: 'Le JPG ne gère pas la transparence et perd un peu de qualité à chaque nouvel enregistrement, ce qui pénalise les logos, les captures d’écran et les images que vous allez encore retoucher.',
			gain: 'Le JPG est accepté partout : formulaires d’envoi, e-mail, suites bureautiques, imprimeurs et vieux logiciels.'
		},
		png: {
			full: 'PNG (Portable Network Graphics)',
			about: 'Le PNG est un format sans perte avec transparence complète, la référence pour les captures d’écran, les logos, les éléments d’interface et tout ce qui contient du texte ou des contours nets. Il fonctionne dans tous les navigateurs et éditeurs, mais les photos en PNG deviennent lourdes.',
			pain: 'Une photo en PNG pèse lourd : une image de 1 Mo en JPG passe facilement à 3 à 5 Mo en PNG, ce qui ralentit les pages et remplit le stockage.',
			gain: 'Le PNG conserve chaque pixel à l’identique et gère la transparence : c’est le choix sûr pour la retouche, les captures d’écran et les visuels avec du texte.'
		},
		webp: {
			full: 'WebP (Google)',
			about: 'Le WebP est un format moderne créé par Google pour le web. Il gère la compression avec ou sans perte et la transparence, et tous les navigateurs actuels l’affichent. Certains anciens logiciels, imprimeurs et formulaires le refusent encore.',
			pain: 'Les images WebP enregistrées depuis un site refusent souvent de s’ouvrir dans les anciens éditeurs, dans Office, chez les imprimeurs et dans certains formulaires d’envoi.',
			gain: 'Le WebP est en général 25 à 35 % plus léger que le JPG à qualité visuelle égale et gère la transparence, ce qui accélère le chargement des pages.'
		},
		avif: {
			full: 'AVIF (AV1 Image File Format)',
			about: 'L’AVIF repose sur le codec vidéo AV1 et compte aujourd’hui parmi les formats d’image les plus efficaces : fichiers très légers, transparence et bon niveau de détail. Les navigateurs modernes le prennent en charge, mais beaucoup de logiciels et de systèmes anciens ne l’ouvrent pas encore.',
			pain: 'L’AVIF reste inconnu de nombreux logiciels : les anciennes versions de Windows et de macOS, Office et plusieurs éditeurs ne savent pas l’ouvrir.',
			gain: 'L’AVIF produit parmi les fichiers les plus légers du moment, souvent deux fois plus petits qu’un JPG comparable, avec la transparence en prime.'
		},
		gif: {
			full: 'GIF (Graphics Interchange Format)',
			about: 'Le GIF est l’un des plus anciens formats du web, célèbre pour ses courtes animations. Il est limité à 256 couleurs par image et sa transparence est en tout ou rien : les photos présentent des bandes de couleur et les fichiers sont lourds.',
			pain: 'Le GIF est limité à 256 couleurs : les dégradés et les photos paraissent granuleux, et le fichier pèse lourd pour ce qu’il montre.',
			gain: 'Le GIF s’ouvre dans tous les navigateurs, clients mail et messageries, même les plus anciens.'
		},
		bmp: {
			full: 'BMP (bitmap Windows)',
			about: 'Le BMP est le bitmap classique de Windows, sans compression. Il stocke les pixels bruts : simple et sans perte, mais énorme. On le croise surtout dans de vieux logiciels, des scanners et des systèmes embarqués.',
			pain: 'Le BMP n’est pas compressé, produit des fichiers énormes et beaucoup de sites et d’applications ne l’acceptent pas.',
			gain: 'Le BMP est exigé par certains logiciels anciens, équipements industriels et écrans embarqués qui ne lisent que des bitmaps bruts.'
		},
		ico: {
			full: 'ICO (icône Windows)',
			about: 'L’ICO est le format d’icône de Windows et le fameux favicon.ico. Un seul fichier peut contenir plusieurs tailles de la même icône (de 16×16 à 256×256), et chaque emplacement utilise la plus nette.',
			pain: 'Un fichier ICO est difficile à réutiliser : la plupart des éditeurs, sites et messageries ne l’ouvrent pas directement.',
			gain: 'L’ICO reste le format de favicon le plus compatible et celui que Windows attend pour les raccourcis et les icônes de programmes.'
		},
		svg: {
			full: 'SVG (Scalable Vector Graphics)',
			about: 'Le SVG décrit des formes plutôt que des pixels : il s’agrandit sans jamais devenir flou. Idéal pour les logos, icônes et illustrations, il est affiché nativement par les navigateurs, mais de nombreux formulaires et réseaux sociaux ne l’acceptent pas.',
			pain: 'Le SVG est souvent refusé par les réseaux sociaux, les places de marché, Office et les formulaires qui attendent une image classique.',
			gain: 'Le SVG s’agrandit à n’importe quelle taille sans perte de netteté et reste minuscule pour les logos et les illustrations en aplats.'
		},
		heic: {
			full: 'HEIC/HEIF (High Efficiency Image File)',
			about: 'Le HEIC est le format par défaut des photos d’iPhone et d’iPad. Il garde une bonne qualité pour environ la moitié du poids d’un JPG, mais Windows, Android, de nombreux sites et la plupart des formulaires ne l’ouvrent pas sans logiciel supplémentaire.',
			pain: 'Les photos HEIC d’un iPhone ne s’ouvrent souvent ni sur Windows, ni sur Android, ni sur les sites web, et les formulaires d’envoi les refusent.',
			gain: ''
		},
		tiff: {
			full: 'TIFF (Tagged Image File Format)',
			about: 'Le TIFF est un format professionnel utilisé pour la numérisation, l’impression, l’édition et l’archivage. Il est généralement sans perte et accepte une grande profondeur de couleur, mais les fichiers sont lourds et les navigateurs ne l’affichent pas.',
			pain: 'Le TIFF produit des fichiers lourds que les navigateurs, les clients mail et la plupart des sites ne savent pas afficher.',
			gain: 'Le TIFF est le format que demandent souvent imprimeurs, scanners, éditeurs et services d’archives, car il est sans perte et bien pris en charge par les logiciels professionnels.'
		},
		psd: {
			full: 'PSD (document Adobe Photoshop)',
			about: 'Le PSD est le fichier de travail d’Adobe Photoshop, avec calques, masques et effets. Parfait pour retoucher, mais il faut Photoshop ou un éditeur compatible pour l’ouvrir, et les fichiers sont lourds.',
			pain: 'Un PSD exige Photoshop ou un éditeur compatible : clients, sites et téléphones ne peuvent généralement même pas l’afficher.',
			gain: ''
		},
		pdf: {
			full: 'PDF (Portable Document Format)',
			about: 'Le PDF est le format universel des documents. Il s’ouvre sur n’importe quel ordinateur ou téléphone, s’imprime sans surprise et c’est ce que demandent la plupart des formulaires, écoles, banques et administrations.',
			pain: '',
			gain: 'Le PDF est ce que demandent portails, écoles, banques et administrations quand il faut joindre, imprimer ou envoyer des documents numérisés.'
		}
	},
	pairLabel: (A, B) => `${A} en ${B}`,
	pairTitle: (A, B) => `Convertir ${A} en ${B} en ligne, gratuit et privé`,
	pairH1: (A, B) => `Convertir ${A} en ${B} en ligne`,
	pairLead: (A, B) =>
		`Transformez vos images ${A} en ${B} directement dans le navigateur. Vos fichiers ne quittent pas votre appareil, sans inscription ni filigrane, et vous pouvez convertir des dizaines d’images d’un coup.`,
	pairDesc: (A, B, hook) => [
		`Convertissez ${A} en ${B} gratuitement dans le navigateur. ${hook} Par lots, sans envoi de fichiers ni inscription.`,
		`Convertissez ${A} en ${B} gratuitement dans le navigateur. ${hook} Sans envoi, sans inscription, sans filigrane.`,
		`Convertissez ${A} en ${B} gratuitement. ${hook} Par lots, sans envoi de fichiers ni inscription.`,
		`${A} en ${B} gratuit et privé. ${hook} Sans envoi de fichiers.`
	],
	hook: {
		heic: () => 'Vos photos d’iPhone s’ouvrent partout, sans la localisation.',
		trace: () => 'Vraie vectorisation, avec le nombre de couleurs choisi.',
		pdf: () => 'Chaque image devient une page du PDF, prête à envoyer.',
		ico: () => 'Favicon multi-tailles en un seul fichier, de 16 à 256 px.',
		psd: () => 'Fichiers Photoshop aplatis sans ouvrir Photoshop.',
		gifFrame: () => 'Utilise la première image du GIF, en couleurs complètes.',
		raster: () => 'Le vecteur est rendu en pixels à la taille voulue.',
		icoIn: () => 'Extrayez l’icône en image classique, facile à partager.',
		alpha: () => 'Choisissez la couleur de fond des zones transparentes.',
		palette: () => 'Palette de 256 couleurs pour une compatibilité maximale.',
		smaller: () => 'Fichiers plus légers, réglage de qualité ou taille cible en Ko.',
		lossless: () => 'Sortie sans perte, qui ne se dégrade plus à la retouche.',
		archive: () => 'Sortie sans perte pour l’impression et l’archivage.',
		generic: () => 'Orientation respectée, métadonnées supprimées.'
	},
	h2: {
		why: (A, B) => `Pourquoi convertir ${A} en ${B} ?`,
		changes: () => 'Ce qui change pendant la conversion',
		size: (A, B) => `Poids du fichier : ${A} ou ${B}`,
		not: () => 'Quand il vaut mieux ne pas convertir',
		about: (A, B) => `À propos des formats ${A} et ${B}`
	},
	note: {
		heic: () => 'Les photos HEIC sont décodées sur votre appareil, pivotées selon l’orientation EXIF et enregistrées sans les métadonnées de l’appareil photo : la position GPS de votre photo d’iPhone ne suit pas dans le nouveau fichier.',
		psd: () => 'Le PSD est aplati : tous les calques visibles, masques et effets sont fusionnés en une seule image, telle que Photoshop l’affiche. Si vous avez besoin des calques, ouvrez plutôt le fichier dans l’éditeur.',
		gifFrame: () => 'Seule la première image d’un GIF animé est convertie. Les GIF à image unique sont convertis entièrement.',
		raster: (A) => `Le fichier ${A} est rendu en pixels. La netteté vectorielle devient une résolution fixe : choisissez une taille suffisante dans les options de redimensionnement si vous voulez une grande image.`,
		trace: (A) => `Il s’agit d’une vraie vectorisation : l’image ${A} est tracée en chemins SVG, et non simplement intégrée dans un fichier SVG. Vous choisissez le nombre de couleurs ; moins de couleurs donnent des formes plus nettes et des fichiers plus légers, plus de couleurs gardent davantage de détails.`,
		pdf: () => 'Chaque image est placée sur sa propre page du PDF : un lot de photos ou de documents numérisés devient des pages prêtes à envoyer, imprimer ou joindre à un formulaire.',
		ico: () => 'L’ICO est généré avec plusieurs tailles dans un seul fichier (de 16×16 à 256×256), comme l’attendent les navigateurs et Windows pour un favicon ou une icône de programme. Les images carrées donnent le meilleur résultat.',
		icoIn: (A, B) => `L’image de l’icône contenue dans le fichier ${A} devient un fichier ${B} classique, que vous pouvez retoucher, envoyer ou partager comme n’importe quelle photo.`,
		palette: (A, B) => `Le ${B} stocke au maximum 256 couleurs : le convertisseur construit une palette optimisée. Les visuels en aplats restent nets, mais les photos et les dégradés peuvent présenter des bandes.`,
		alphaLost: (A, B) => `Le format ${B} ne gère pas la transparence. Les zones transparentes du fichier ${A} sont remplies avec la couleur de fond de votre choix (blanc par défaut), pour éviter un logo dans un carré noir.`,
		alphaKept: (A, B) => `La transparence est conservée : les pixels transparents et semi-transparents du fichier ${A} restent transparents en ${B}.`,
		toLossy: (A, B) => `Le format ${B} utilise une compression avec perte : vous réglez le compromis avec le curseur de qualité, ou vous indiquez une taille cible en Ko et le convertisseur trouve la bonne qualité.`,
		lossyToLossless: (A, B) => `Le ${B} est sans perte : plus rien ne se dégrade à partir de là, mais il ne récupère pas les détails déjà supprimés par la compression du ${A}.`,
		exact: (A, B) => `Ici, les deux formats sont sans perte : les pixels du fichier ${A} sont recopiés à l’identique en ${B}, sans aucune perte de qualité. Seul le mode de stockage change.`,
		exif: () => 'L’orientation EXIF est respectée, les photos prises de travers sortent donc droites, et les métadonnées comme la position GPS, le modèle d’appareil et la date sont supprimées pour protéger votre vie privée.'
	},
	size: {
		smaller: (A, B) => `Pour des photos, le ${B} est généralement nettement plus léger que le ${A} à qualité visuelle comparable. Le gain exact dépend du contenu : une photo très détaillée se compresse moins qu’un visuel en aplats.`,
		larger: (A, B) => `Attendez-vous à des fichiers ${B} plus lourds que les ${A} d’origine, parfois plusieurs fois plus pour des photos, car le ${B} stocke plus de données par pixel. C’est le prix de la compatibilité ou de la qualité sans perte.`,
		similar: (A, B) => `Le ${A} et le ${B} donnent en général des fichiers de poids comparable. Le résultat dépend davantage des dimensions de l’image et de la qualité choisie que du format lui-même.`,
		toSvg: (A) => `Le poids d’un SVG dépend de la complexité de l’image, pas du nombre de pixels. Un logo à quelques aplats donne un fichier minuscule ; une photo ${A} très détaillée produit des milliers de chemins et un SVG lourd.`,
		toIco: () => 'Les fichiers ICO sont légers : même avec toutes les tailles jusqu’à 256×256, un favicon reste en général à quelques dizaines de Ko.',
		toPdf: (A) => `Le PDF pèse à peu près le poids des images qu’il contient. Pour envoyer un PDF plus léger, réduisez les dimensions des images ${A} dans les options de redimensionnement avant de convertir.`,
		fromSvg: (A, B) => `Un fichier ${A} de quelques Ko peut devenir un ${B} bien plus lourd, car la sortie stocke chaque pixel. Le poids augmente avec la résolution choisie.`,
		fromIco: (A, B) => `Les icônes sont de petites images : le fichier ${B} sera lui aussi léger, en général quelques Ko.`
	},
	sizeTip: () => 'Vous pouvez aussi redimensionner dans la même étape (en pourcentage, pour tenir dans un cadre ou en pixels exacts) pour alléger encore les fichiers.',
	not: {
		keepLayers: (A) => `Gardez le ${A} d’origine si vous comptez le retoucher : l’aplatissement fusionne les calques définitivement. Convertissez une copie pour la partager.`,
		keepAnim: (A, B) => `Si l’animation compte, gardez le ${A} : un ${B} statique ne conserve que la première image.`,
		keepVector: (A) => `Pour les logos et icônes d’un site, gardez le ${A} : il reste net à toutes les tailles et pèse souvent moins. Ne convertissez que là où une image classique est exigée.`,
		noPhotoTrace: (A) => `N’attendez pas une copie parfaite en vectorisant des photos ${A} : le tracé fonctionne mieux sur les logos, icônes, dessins et illustrations en aplats avec peu de couleurs.`,
		icoPhoto: () => 'N’utilisez pas l’ICO pour des photos : il est conçu pour de petites icônes carrées.',
		pdfEdit: (A) => `Si le destinataire doit retoucher ou réutiliser l’image, envoyez directement le fichier ${A} : extraire une image d’un PDF est plus compliqué.`,
		keepLossless: (A, B) => `Pour les captures d’écran, le texte, les schémas et les logos aux contours nets, le ${A} reste parfois le meilleur choix ; le ${B}, avec perte, peut flouter les lettres aux qualités basses.`,
		recompress: (A, B) => `Passer d’un format avec perte à un autre compresse l’image deux fois. Utilisez une qualité élevée et partez du fichier ${A} d’origine, pas d’une copie déjà réenregistrée.`,
		lossyGrow: (A, B) => `Si vous voulez seulement un fichier plus léger, le ${B} est la mauvaise direction : il sera plus lourd que le ${A} sans être plus beau.`,
		heavy: (A, B) => `Le ${B} n’est pas fait pour le web : navigateurs et messageries le gèrent mal. Utilisez-le seulement quand un logiciel ou un imprimeur le demande.`,
		avifCompat: (A, B) => `Vérifiez la destination du fichier : l’${B} est excellent pour les sites web, mais certains logiciels, systèmes anciens et formulaires ne l’ouvrent pas encore.`,
		generic: (A) => `Si le fichier ${A} fonctionne déjà là où vous en avez besoin, inutile de le convertir. Chaque conversion est l’occasion de changer la taille ou la qualité.`
	},
	faq: {
		heic: () => ({ q: 'Puis-je convertir les photos directement depuis mon iPhone ?', a: 'Oui. Ouvrez cette page sur l’iPhone, choisissez les photos dans la photothèque ou l’app Fichiers, et la conversion se fait sur le téléphone. Les fichiers HEIF sont aussi acceptés.' }),
		psd: () => ({ q: 'Les calques Photoshop sont-ils conservés ?', a: 'Pas dans cette conversion : le PSD est aplati en une seule image, telle qu’elle apparaît dans Photoshop. Pour travailler avec les calques, ouvrez-le dans l’éditeur en ligne, qui lit et exporte le PSD avec calques.' }),
		anim: (A, B) => ({ q: `L’animation du ${A} est-elle conservée en ${B} ?`, a: `Non. Le convertisseur lit la première image du ${A} : le ${B} est une image fixe de cette première image.` }),
		trace: (A) => ({ q: 'Le SVG est-il un vrai vecteur ou une image intégrée ?', a: `C’est un vrai vecteur. L’image ${A} est tracée en chemins SVG avec le nombre de couleurs choisi : vous pouvez l’agrandir et la modifier dans Illustrator, Inkscape ou Figma.` }),
		svgSize: (A, B) => ({ q: `Quelle sera la résolution du ${B} ?`, a: `Par défaut, la taille définie dans le fichier ${A}. Utilisez les options de redimensionnement pour fixer un pourcentage ou des pixels exacts ; la source étant vectorielle, l’agrandissement ne floute pas.` }),
		pdf: (A) => ({ q: 'Comment les pages sont-elles organisées dans le PDF ?', a: `Chaque image ${A} est placée sur sa propre page, dans l’ordre de la liste : dix images donnent dix pages.` }),
		ico: () => ({ q: 'Quelles tailles contient le fichier ICO ?', a: 'Plusieurs tailles d’icône standard, de 16×16 à 256×256, dans un seul fichier. Il sert de favicon.ico comme d’icône Windows.' }),
		alphaLost: (A, B) => ({ q: 'Que devient le fond transparent ?', a: `Le ${B} ne gère pas la transparence : les zones transparentes reçoivent la couleur de fond choisie (blanc par défaut). Gardez le PNG ou le WebP si la transparence est nécessaire.` }),
		alphaKept: (A, B) => ({ q: 'La transparence est-elle conservée ?', a: `Oui. Les pixels transparents et semi-transparents du fichier ${A} restent transparents en ${B}.` }),
		quality: (A, B) => ({ q: `Puis-je choisir la qualité ou le poids du ${B} ?`, a: 'Oui. Utilisez le curseur de qualité, ou saisissez une taille cible en Ko : le convertisseur cherche la meilleure qualité qui tient dans cette limite.' }),
		lossless: (A, B) => ({ q: `Convertir en ${B} améliore-t-il la qualité de mon ${A} ?`, a: `Non. Le ${B} évite de nouvelles pertes, mais les détails supprimés par la compression du ${A} ne reviennent pas.` })
	},
	faqSize: (A, B) => `Le ${B} est-il plus léger que le ${A} ?`,
	faqBatch: (A, B) => ({ q: `Puis-je convertir plusieurs fichiers ${A} en ${B} d’un coup ?`, a: `Oui. Déposez autant de fichiers ${A} que vous voulez : ils sont convertis en parallèle et vous les téléchargez un par un, dans un ZIP ou directement dans un dossier.` }),
	general: {
		free: { q: 'Est-ce vraiment gratuit ?', a: 'Oui. Sans inscription, sans filigrane, sans limite quotidienne et sans formule payante. C’est gratuit parce que tout le travail se fait sur votre propre appareil.' },
		upload: { q: 'Mes images sont-elles envoyées sur un serveur ?', a: 'Non. Tout s’exécute dans le navigateur grâce aux Web Workers ; les fichiers ne quittent pas votre appareil. Les métadonnées comme la position GPS sont retirées du résultat.' },
		batch: { q: 'Combien d’images puis-je convertir à la fois ?', a: 'Il n’y a pas de limite fixe. Les fichiers sont traités en parallèle et la limite pratique est la mémoire de votre appareil.' },
		phone: { q: 'Est-ce que ça marche sur iPhone et Android ?', a: 'Oui. Ça fonctionne dans tout navigateur mobile récent, y compris Safari sur iPhone et Chrome sur Android, sans application à installer.' }
	},
	steps: {
		add: (A) => `Glissez vos fichiers ${A} dans le convertisseur ci-dessus ou touchez pour les choisir. Vous pouvez en ajouter plusieurs à la fois.`,
		target: (A, B) => `Le format ${B} est déjà sélectionné en sortie sur cette page.`,
		convert: (A, B) => `Convertissez puis téléchargez chaque fichier ${B}, le tout dans un ZIP, ou enregistrez-les directement dans un dossier (Chrome et Edge).`
	},
	opt: {
		quality: (A, B) => `Réglez la qualité du ${B} ou fixez une taille cible en Ko.`,
		background: (A, B) => `Choisissez la couleur de fond des zones transparentes (le ${B} ne gère pas la transparence).`,
		colors: () => 'Choisissez le nombre de couleurs de la vectorisation.',
		icoSizes: () => 'Utilisez une image carrée : les tailles d’icône jusqu’à 256×256 sont générées automatiquement.',
		pdfPage: () => 'Ordonnez les fichiers dans la liste : chaque image devient une page.',
		resize: () => 'Si besoin, redimensionnez en pourcentage, pour tenir dans un cadre ou en pixels exacts.'
	},
	hubs: {
		converter: {
			label: 'Convertisseur d’images',
			title: 'Convertisseur d’images en ligne gratuit et privé',
			description: 'Convertissez JPG, PNG, WebP, AVIF, HEIC, GIF, TIFF, PSD et SVG dans le navigateur. Conversion par lots, compression et redimensionnement, sans envoi.',
			h1: 'Convertisseur d’images en ligne et gratuit',
			lead: 'Convertissez vos images entre 11 formats d’entrée et 11 formats de sortie directement dans le navigateur. Les fichiers sont traités sur votre appareil, jamais envoyés, et vous pouvez convertir tout un dossier d’un coup.',
			sections: [
				{ h2: 'Formats lus et produits', body: [
					'Entrée : JPG/JPEG, PNG, WebP, AVIF, GIF (première image), BMP, ICO, SVG, HEIC/HEIF d’iPhone, TIFF et PSD Photoshop (aplati).',
					'Sortie : JPG, PNG, WebP, AVIF, GIF, BMP, ICO multi-tailles pour favicon, TIFF, PDF avec une page par image, vrai SVG vectoriel avec nombre de couleurs réglable, et PSD.'
				] },
				{ h2: 'Les options qui comptent', body: [
					'Réglez la qualité du JPG, du WebP et de l’AVIF, ou indiquez une taille cible en Ko et laissez le convertisseur trouver la meilleure qualité possible. Redimensionnez en pourcentage, pour tenir dans un cadre ou en pixels exacts.',
					'Pour les formats sans transparence, vous choisissez la couleur de fond. L’orientation EXIF est respectée et les métadonnées comme la position GPS sont supprimées, pour que la photo ne révèle pas où elle a été prise.'
				] },
				{ h2: 'Privé par conception', body: [
					'La conversion tourne dans des Web Workers, dans le navigateur, en parallèle. Rien n’est envoyé à un serveur : c’est sûr pour les documents confidentiels, sans file d’attente ni limite quotidienne.'
				] }
			],
			steps: [
				'Glissez les images dans le convertisseur ou touchez pour les choisir ; les formats peuvent être mélangés.',
				'Choisissez le format de sortie et, si besoin, la qualité, la taille cible ou le redimensionnement.',
				'Convertissez puis téléchargez chaque fichier, un ZIP complet, ou enregistrez directement dans un dossier (Chrome et Edge).'
			],
			faq: [
				{ q: 'Quel format choisir pour un site web ?', a: 'Le WebP pour des fichiers légers et bien pris en charge, l’AVIF pour les fichiers les plus légers dans les navigateurs modernes, le PNG pour les visuels qui doivent rester parfaits au pixel près.' },
				{ q: 'Puis-je convertir les photos HEIC d’un iPhone ?', a: 'Oui. Le HEIC et le HEIF sont lus directement dans le navigateur et peuvent devenir JPG, PNG, WebP ou PDF, sans la localisation.' },
				{ q: 'Mes images sont-elles envoyées ?', a: 'Non. Tout est traité localement dans le navigateur ; les fichiers ne quittent pas votre appareil.' },
				{ q: 'Y a-t-il une limite de fichiers ?', a: 'Pas de limite fixe. Les fichiers sont convertis en parallèle et la limite pratique est la mémoire de l’appareil.' }
			]
		},
		editor: {
			label: 'Éditeur d’images en ligne',
			title: 'Éditeur d’images en ligne avec calques, gratuit',
			description: 'Éditeur photo en ligne gratuit inspiré de Paint.NET : calques, modes de fusion, baguette magique, détourage par IA, 39 filtres et texte 3D. Sans envoi.',
			h1: 'Éditeur d’images en ligne avec calques',
			lead: 'Un éditeur d’images complet dans le navigateur, inspiré de Paint.NET : calques, sélections, filtres, texte et formes, plus une IA locale pour sélectionner les sujets. Rien n’est envoyé.',
			sections: [
				{ h2: 'Calques et sélections', body: [
					'Travaillez avec des calques, l’opacité et les modes de fusion, puis fusionnez ou aplatissez à la fin. Sélectionnez au rectangle, à l’ellipse ou au lasso, en ajoutant, soustrayant ou intersectant.',
					'La baguette magique propose cinq algorithmes, du remplissage contigu classique aux modes qui respectent les contours et regroupent les couleurs, pour des sélections propres sur les images difficiles.'
				] },
				{ h2: 'Filtres, texte et effets', body: [
					'39 filtres avec aperçu en direct : réglages de couleur, flous, netteté, bruit, styliser, déformer et artistiques. Ajoutez du texte avec extrusion 3D, néon, ombre et contour, ainsi que des formes vectorielles modifiables.'
				] },
				{ h2: 'IA locale et export', body: [
					'La sélection intelligente et la suppression d’arrière-plan utilisent des modèles d’IA téléchargés une fois et exécutés sur votre appareil. Exportez en PNG, JPG, WebP, AVIF, ICO, PSD avec calques ou SVG vectoriel. Sur mobile, il gère le tactile et le zoom à deux doigts.'
				] }
			],
			steps: [
				'Ouvrez une image (glisser-déposer, coller avec Ctrl+V ou choisir un fichier) ; le PSD s’ouvre avec ses calques.',
				'Retouchez avec les calques, sélections, filtres, texte et formes.',
				'Exportez au format voulu, y compris PSD avec calques et SVG vectoriel.'
			],
			faq: [
				{ q: 'Faut-il installer quelque chose ?', a: 'Non. L’éditeur fonctionne dans tout navigateur récent, sur ordinateur comme sur mobile.' },
				{ q: 'Ouvre-t-il les fichiers Photoshop ?', a: 'Oui. Les PSD s’ouvrent avec leurs calques et peuvent être réexportés en PSD avec calques.' },
				{ q: 'Mes images sont-elles envoyées ?', a: 'Non. La retouche, les filtres et même les fonctions d’IA s’exécutent sur votre appareil.' },
				{ q: 'Est-ce que ça marche sur mobile ?', a: 'Oui. L’interface s’adapte au tactile, avec une barre d’outils en bas et le zoom à deux doigts.' }
			]
		},
		'remove-bg': {
			label: 'Supprimer l’arrière-plan',
			title: 'Supprimer l’arrière-plan d’une image, IA locale',
			description: 'Supprimez l’arrière-plan de vos photos avec une IA qui tourne sur votre appareil. Sans envoi, sans inscription, sans filigrane. Export en PNG transparent.',
			h1: 'Supprimer l’arrière-plan d’une image avec une IA locale',
			lead: 'Détourez automatiquement personnes, produits et objets. Le modèle d’IA est téléchargé une fois et s’exécute dans le navigateur : votre photo ne quitte pas l’appareil.',
			sections: [
				{ h2: 'Comment ça marche', body: [
					'Un modèle de segmentation repère le sujet principal et rend l’arrière-plan transparent. À la première utilisation, le modèle est téléchargé puis conservé dans le navigateur pour les fois suivantes.',
					'Il utilise WebGPU quand c’est possible et WebAssembly sinon : il fonctionne donc sur la plupart des ordinateurs et téléphones récents, simplement plus vite sur certains.'
				] },
				{ h2: 'Affiner et exporter', body: [
					'Le résultat s’ouvre dans l’éditeur complet : corrigez les bords à la gomme ou au pinceau, affinez avec la baguette magique ou la sélection intelligente, ajoutez une nouvelle couleur ou image de fond, puis exportez en PNG ou WebP transparent.'
				] }
			],
			steps: [
				'Ouvrez la photo dans l’éditeur (glisser-déposer, coller ou choisir un fichier).',
				'Lancez la suppression d’arrière-plan ; le modèle est téléchargé une fois et tourne en local.',
				'Retouchez les bords si besoin et exportez en PNG ou WebP transparent.'
			],
			faq: [
				{ q: 'Ma photo est-elle envoyée sur un serveur ?', a: 'Non. Contrairement à la plupart des outils de détourage, l’IA tourne sur votre appareil ; seuls les fichiers du modèle sont téléchargés.' },
				{ q: 'Pourquoi la première fois est-elle plus lente ?', a: 'Le modèle est téléchargé à la première utilisation. Ensuite, il est conservé dans le navigateur et démarre bien plus vite.' },
				{ q: 'Y a-t-il un filigrane ou une limite de résolution ?', a: 'Ni filigrane ni formule HD payante. Les grandes images prennent simplement plus de temps sur les appareils lents.' }
			]
		},
		compress: {
			label: 'Compresser une image',
			title: 'Compresser une image en Ko, gratuit et sans envoi',
			description: 'Compressez vos images JPG, PNG, WebP et AVIF jusqu’à une taille cible en Ko, dans le navigateur. Compression par lots, sans envoi, sans métadonnées.',
			h1: 'Compresser des images à la taille voulue',
			lead: 'Allégez vos photos pour les formulaires, l’e-mail et le web sans les envoyer nulle part. Fixez une taille cible en Ko ou un niveau de qualité et compressez plusieurs images d’un coup.',
			sections: [
				{ h2: 'Atteindre une taille précise en Ko', body: [
					'Beaucoup de portails n’acceptent que des fichiers de moins de 100 Ko, 200 Ko ou 1 Mo. Saisissez la limite et le compresseur cherche la meilleure qualité qui reste en dessous.',
					'Si l’image reste trop lourde à une qualité raisonnable, réduisez aussi ses dimensions : diviser la largeur et la hauteur par deux divise le nombre de pixels par quatre.'
				] },
				{ h2: 'Choisir le bon format', body: [
					'Le WebP et l’AVIF donnent des fichiers bien plus légers que le JPG à qualité visuelle égale. Gardez le JPG quand la destination n’accepte pas les formats modernes. Le PNG est sans perte et compresse donc très peu les photos.',
					'Les métadonnées comme le modèle d’appareil et la position GPS sont supprimées, ce qui fait gagner quelques Ko et protège votre vie privée.'
				] }
			],
			steps: [
				'Ajoutez vos images au compresseur ; un lot entier est possible.',
				'Fixez la taille cible en Ko ou réglez la qualité, et choisissez le format de sortie.',
				'Compressez puis téléchargez une par une, dans un ZIP ou dans un dossier.'
			],
			faq: [
				{ q: 'La compression abîme-t-elle la qualité ?', a: 'Avec des réglages modérés, la différence se voit à peine. Le compresseur garde la meilleure qualité qui tient dans la taille cible.' },
				{ q: 'Puis-je compresser un PNG sans changer de format ?', a: 'Le PNG est sans perte, le gain reste donc limité. Pour réduire fortement, convertissez en WebP, qui garde aussi la transparence.' },
				{ q: 'Mes images sont-elles envoyées ?', a: 'Non. La compression s’exécute dans le navigateur ; les fichiers ne quittent pas votre appareil.' }
			]
		},
		resize: {
			label: 'Redimensionner une image',
			title: 'Redimensionner une image en ligne, gratuit',
			description: 'Redimensionnez vos images en pourcentage, pour tenir dans un cadre ou en pixels exacts, dans le navigateur. Par lots : JPG, PNG, WebP, HEIC et plus.',
			h1: 'Redimensionner des images en ligne',
			lead: 'Changez les dimensions d’une image ou de cent à la fois. Choisissez un pourcentage, un cadre maximal ou une largeur et une hauteur exactes, et changez de format dans la même étape.',
			sections: [
				{ h2: 'Trois façons de redimensionner', body: [
					'Le pourcentage met tout à l’échelle de façon égale, par exemple 50 % pour la moitié de la taille. Le cadre garde les proportions dans une largeur et une hauteur maximales, idéal pour des lots de photos variées. Le mode exact fixe les dimensions en pixels.',
					'L’orientation EXIF est appliquée d’abord : les photos en portrait gardent la bonne forme.'
				] },
				{ h2: 'Redimensionner et convertir ensemble', body: [
					'Combinez le redimensionnement avec n’importe quel format de sortie et réglage de qualité : par exemple, transformez des photos HEIC d’iPhone en JPG de 1600 px et moins de 300 Ko en une seule passe.'
				] }
			],
			steps: [
				'Ajoutez les images à redimensionner.',
				'Choisissez pourcentage, cadre ou pixels exacts, ainsi que le format de sortie.',
				'Convertissez et téléchargez les images redimensionnées, dans un ZIP si vous préférez.'
			],
			faq: [
				{ q: 'Le redimensionnement garde-t-il les proportions ?', a: 'Le pourcentage et le cadre les gardent toujours. En taille exacte, vous fixez librement les deux dimensions.' },
				{ q: 'Puis-je agrandir une image ?', a: 'Oui, mais agrandir une photo ne crée pas de vrais détails ; le SVG fait exception et reste net.' },
				{ q: 'Les images sont-elles envoyées ?', a: 'Non. Le redimensionnement se fait dans le navigateur.' }
			]
		}
	}
};
