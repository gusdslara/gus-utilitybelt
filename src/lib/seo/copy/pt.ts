// Textos em português (pt-BR) das páginas de SEO (conversor e editor de imagens).
import type { Copy } from './types.ts';

export const pt: Copy = {
	fmt: {
		jpg: {
			full: 'JPEG (Joint Photographic Experts Group)',
			about: 'JPG, ou JPEG, é o formato padrão das fotos de câmeras e da maioria dos celulares. Usa compressão com perda, não tem transparência e abre em praticamente qualquer programa, site ou sistema.',
			pain: 'JPG não tem transparência e cada vez que é salvo de novo perde um pouco de qualidade, o que atrapalha logos, prints e imagens que você ainda vai editar.',
			gain: 'JPG é aceito em todo lugar: formulários de envio, e-mail, pacote Office, gráficas e programas antigos.'
		},
		png: {
			full: 'PNG (Portable Network Graphics)',
			about: 'PNG é um formato sem perda e com transparência total, o padrão para prints de tela, logos, elementos de interface e tudo que tem texto ou bordas nítidas. Funciona em qualquer navegador e editor, mas fotos em PNG ficam pesadas.',
			pain: 'Foto em PNG pesa muito: uma imagem de 1 MB em JPG facilmente vira 3 a 5 MB em PNG, deixando sites lentos e enchendo o armazenamento.',
			gain: 'PNG guarda cada pixel exatamente como está e tem transparência, por isso é a escolha segura para edição, prints e artes com texto.'
		},
		webp: {
			full: 'WebP (Google)',
			about: 'WebP é um formato moderno criado pelo Google para a web. Aceita compressão com e sem perda e transparência, e todos os navegadores atuais exibem. Alguns programas antigos, gráficas e formulários ainda recusam.',
			pain: 'Imagens WebP baixadas de sites muitas vezes não abrem em editores antigos, no Office, em gráficas e em alguns formulários de envio.',
			gain: 'WebP costuma ficar 25% a 35% menor que JPG com a mesma qualidade visual e ainda tem transparência, o que deixa as páginas mais rápidas.'
		},
		avif: {
			full: 'AVIF (AV1 Image File Format)',
			about: 'AVIF nasceu do codec de vídeo AV1 e hoje é um dos formatos de imagem mais eficientes: arquivos muito pequenos, com transparência e bom nível de detalhe. Navegadores modernos suportam, mas muitos programas e sistemas antigos ainda não abrem.',
			pain: 'AVIF ainda é desconhecido para muitos programas: versões antigas do Windows e do macOS, o Office e vários editores não abrem o arquivo.',
			gain: 'AVIF gera alguns dos menores arquivos possíveis hoje, muitas vezes metade de um JPG equivalente, e ainda aceita transparência.'
		},
		gif: {
			full: 'GIF (Graphics Interchange Format)',
			about: 'GIF é um dos formatos mais antigos da web, famoso pelas animações curtas. Fica limitado a 256 cores por quadro e a transparência é só “liga ou desliga”, então fotos ficam com faixas de cor e os arquivos são grandes.',
			pain: 'GIF tem no máximo 256 cores, então degradês e fotos ficam granulados, e o arquivo é grande para o que mostra.',
			gain: 'GIF abre em qualquer navegador, cliente de e-mail e aplicativo de conversa, até nos mais antigos.'
		},
		bmp: {
			full: 'BMP (Bitmap do Windows)',
			about: 'BMP é o bitmap clássico do Windows, sem compressão. Guarda os pixels crus, então é simples e sem perda, mas enorme. Hoje aparece mais em programas antigos, scanners e sistemas embarcados.',
			pain: 'BMP não tem compressão, gera arquivos enormes e muitos sites e aplicativos não aceitam.',
			gain: 'BMP é exigido por alguns programas legados, equipamentos industriais e displays embarcados que só leem bitmap puro.'
		},
		ico: {
			full: 'ICO (ícone do Windows)',
			about: 'ICO é o formato de ícone do Windows e o famoso favicon.ico. Um único arquivo pode guardar vários tamanhos do mesmo ícone (de 16×16 a 256×256), e cada lugar usa o mais nítido.',
			pain: 'Arquivo ICO é difícil de reaproveitar: a maioria dos editores, sites e aplicativos de conversa não abre direto.',
			gain: 'ICO continua sendo o formato de favicon mais compatível e o que o Windows espera em atalhos e ícones de programas.'
		},
		svg: {
			full: 'SVG (Scalable Vector Graphics)',
			about: 'SVG descreve formas em vez de pixels, então pode ser ampliado sem perder nitidez. É ideal para logos, ícones e ilustrações e os navegadores exibem nativamente, mas muitos formulários e redes sociais não aceitam.',
			pain: 'SVG costuma ser recusado por redes sociais, marketplaces, Office e formulários que esperam uma imagem comum.',
			gain: 'SVG pode ser ampliado para qualquer tamanho sem perder nitidez e costuma ser minúsculo para logos e ilustrações chapadas.'
		},
		heic: {
			full: 'HEIC/HEIF (High Efficiency Image File)',
			about: 'HEIC é o formato padrão das fotos do iPhone e do iPad. Mantém boa qualidade com cerca de metade do tamanho de um JPG, mas Windows, Android, muitos sites e a maioria dos formulários não abrem sem programa extra.',
			pain: 'Foto HEIC do iPhone muitas vezes não abre no Windows, no Android nem em sites, e formulários de envio recusam o arquivo.',
			gain: ''
		},
		tiff: {
			full: 'TIFF (Tagged Image File Format)',
			about: 'TIFF é um formato profissional usado em digitalização, gráfica, editoras e arquivamento. Normalmente é sem perda e aceita alta profundidade de cor, mas os arquivos são grandes e o navegador não exibe.',
			pain: 'TIFF gera arquivos grandes e navegadores, clientes de e-mail e a maioria dos sites não conseguem exibir.',
			gain: 'TIFF é o que gráficas, scanners, editoras e acervos costumam pedir, por ser sem perda e bem suportado por programas profissionais.'
		},
		psd: {
			full: 'PSD (documento do Adobe Photoshop)',
			about: 'PSD é o arquivo de trabalho do Adobe Photoshop, com camadas, máscaras e efeitos. Ótimo para editar, mas só abre no Photoshop ou em editor compatível, e os arquivos são pesados.',
			pain: 'PSD precisa do Photoshop ou de um editor compatível para abrir, então cliente, site e celular normalmente não conseguem nem visualizar.',
			gain: ''
		},
		pdf: {
			full: 'PDF (Portable Document Format)',
			about: 'PDF é o formato universal de documentos. Abre em qualquer computador ou celular, imprime sem surpresas e é o que formulários, escolas, bancos e portais do governo costumam pedir.',
			pain: '',
			gain: 'PDF é o que portais, escolas, bancos e empresas pedem quando você precisa anexar, imprimir ou enviar documentos digitalizados.'
		}
	},
	pairLabel: (A, B) => `${A} para ${B}`,
	pairTitle: (A, B) => `Converter ${A} para ${B} online grátis`,
	pairH1: (A, B) => `Converter ${A} para ${B} online`,
	pairLead: (A, B) =>
		`Transforme imagens ${A} em ${B} aqui mesmo, no navegador. Os arquivos não saem do seu aparelho, não precisa de cadastro, não tem marca d’água e dá para converter dezenas de imagens de uma vez.`,
	pairDesc: (A, B, hook) => [
		`Converta ${A} para ${B} grátis no navegador. ${hook} Em lote, sem upload, sem cadastro e sem marca d’água.`,
		`Converta ${A} para ${B} grátis no navegador. ${hook} Em lote, sem upload e sem cadastro.`,
		`Converta ${A} para ${B} grátis. ${hook} Sem upload e sem cadastro.`,
		`${A} para ${B} grátis e privado. ${hook}`
	],
	hook: {
		heic: () => 'Fotos do iPhone abrem em qualquer lugar, sem a localização.',
		trace: () => 'Vetorização de verdade, com o número de cores que você escolher.',
		pdf: () => 'Cada imagem vira uma página do PDF, pronta para enviar ou imprimir.',
		ico: () => 'Favicon com vários tamanhos num só arquivo, de 16 a 256 px.',
		psd: () => 'Arquivos do Photoshop achatados sem precisar abrir o Photoshop.',
		gifFrame: () => 'Usa o primeiro quadro do GIF, com cores completas.',
		raster: () => 'O vetor é desenhado em pixels no tamanho que você definir.',
		icoIn: () => 'Extraia o ícone como imagem comum, fácil de editar e compartilhar.',
		alpha: () => 'Escolha a cor de fundo das áreas transparentes.',
		palette: () => 'Paleta de 256 cores para máxima compatibilidade.',
		smaller: () => 'Arquivos menores com ajuste de qualidade ou tamanho alvo em KB.',
		lossless: () => 'Saída sem perda, que não degrada nas próximas edições.',
		archive: () => 'Saída sem perda para gráfica, arquivo e programas antigos.',
		generic: () => 'Respeita a orientação e remove metadados por privacidade.'
	},
	h2: {
		why: (A, B) => `Por que converter ${A} para ${B}?`,
		changes: () => 'O que muda na conversão',
		size: (A, B) => `Tamanho do arquivo: ${A} x ${B}`,
		not: () => 'Quando é melhor não converter',
		about: (A, B) => `Sobre ${A} e ${B}`
	},
	note: {
		heic: () => 'As fotos HEIC são decodificadas no seu aparelho, giradas conforme a orientação EXIF e salvas sem os metadados da câmera, então a localização GPS da foto do iPhone não vai junto para o novo arquivo.',
		psd: () => 'O PSD é achatado: todas as camadas visíveis, máscaras e efeitos viram uma única imagem, do jeito que o Photoshop mostra. Se você precisa das camadas, abra o arquivo no editor.',
		gifFrame: () => 'Só o primeiro quadro de um GIF animado é convertido. GIFs de um quadro só são convertidos por inteiro.',
		raster: (A) => `O ${A} é desenhado em pixels. A nitidez do vetor vira uma resolução fixa, então defina um tamanho grande nas opções de redimensionar se precisar de uma imagem grande.`,
		trace: (A) => `É vetorização de verdade: o ${A} é traçado em caminhos SVG, e não apenas embutido dentro de um arquivo SVG. Você escolhe o número de cores; menos cores dão formas mais limpas e arquivos menores, mais cores preservam mais detalhes.`,
		pdf: () => 'Cada imagem vai para uma página própria do PDF, então um lote de fotos ou documentos digitalizados vira páginas prontas para enviar, imprimir ou anexar num formulário.',
		ico: () => 'O ICO é gerado com vários tamanhos dentro de um só arquivo (de 16×16 a 256×256), como navegadores e o Windows esperam de um favicon ou ícone de programa. Imagens quadradas dão o melhor resultado.',
		icoIn: (A, B) => `A imagem do ícone dentro do ${A} vira um arquivo ${B} comum, que você pode editar, enviar ou compartilhar como qualquer foto.`,
		palette: (A, B) => `${B} guarda no máximo 256 cores, então o conversor monta uma paleta otimizada. Artes chapadas continuam nítidas, mas fotos e degradês podem ganhar faixas de cor.`,
		alphaLost: (A, B) => `${B} não tem transparência. As áreas transparentes do ${A} recebem a cor de fundo que você escolher (branco por padrão), para o logo não ficar dentro de um quadrado preto.`,
		alphaKept: (A, B) => `A transparência é mantida: pixels transparentes e semitransparentes do ${A} continuam transparentes no ${B}.`,
		toLossy: (A, B) => `${B} usa compressão com perda, então você controla o equilíbrio pelo ajuste de qualidade, ou informa um tamanho alvo em KB e o conversor encontra a qualidade certa.`,
		lossyToLossless: (A, B) => `${B} é sem perda, então nada mais se perde daqui em diante, mas ele não recupera detalhes que a compressão do ${A} já descartou.`,
		exact: (A, B) => `Os dois formatos são sem perda aqui, então os pixels do ${A} passam para o ${B} exatamente iguais, sem perda de qualidade. Só muda a forma de armazenar.`,
		exif: () => 'A orientação EXIF é respeitada, então fotos “deitadas” saem na posição certa, e metadados como localização GPS, modelo da câmera e data são removidos por privacidade.'
	},
	size: {
		smaller: (A, B) => `Em fotos, o ${B} costuma ficar bem menor que o ${A} com qualidade visual parecida. A economia exata depende do conteúdo: fotos cheias de detalhe comprimem menos que artes chapadas.`,
		larger: (A, B) => `Espere arquivos ${B} maiores que os ${A} originais, às vezes várias vezes maiores em fotos, porque o ${B} guarda mais dados por pixel. É o preço da compatibilidade ou da qualidade sem perda.`,
		similar: (A, B) => `${A} e ${B} costumam ficar na mesma faixa de tamanho. O resultado depende mais das dimensões da imagem e da qualidade escolhida do que do formato em si.`,
		toSvg: (A) => `O tamanho do SVG depende da complexidade da imagem, não da quantidade de pixels. Um logo com poucas cores chapadas vira um arquivo minúsculo; uma foto ${A} cheia de detalhes gera milhares de caminhos e um SVG grande.`,
		toIco: () => 'Arquivos ICO são pequenos: mesmo com todos os tamanhos até 256×256, um favicon costuma ficar na casa das dezenas de KB.',
		toPdf: (A) => `O PDF fica mais ou menos do tamanho das imagens que estão dentro dele. Para enviar um PDF mais leve, reduza as dimensões das imagens ${A} nas opções de redimensionar antes de converter.`,
		fromSvg: (A, B) => `Um ${A} de poucos KB pode virar um ${B} bem maior, porque a saída guarda cada pixel. O tamanho cresce com a resolução escolhida.`,
		fromIco: (A, B) => `Ícones são imagens pequenas, então o arquivo ${B} também fica pequeno, normalmente poucos KB.`
	},
	sizeTip: () => 'Dá para redimensionar no mesmo passo (por porcentagem, para caber numa caixa ou em pixels exatos) e deixar os arquivos ainda mais leves.',
	not: {
		keepLayers: (A) => `Guarde o ${A} original se ainda for editar: o achatamento junta as camadas de vez. Converta uma cópia para compartilhar.`,
		keepAnim: (A, B) => `Se a animação importa, fique com o ${A}: um ${B} estático guarda só o primeiro quadro.`,
		keepVector: (A) => `Para logos e ícones em sites, mantenha o ${A}: ele fica nítido em qualquer tamanho e costuma ser menor. Converta só onde uma imagem comum for exigida.`,
		noPhotoTrace: (A) => `Não espere uma cópia perfeita ao vetorizar fotos ${A}: o traçado funciona melhor em logos, ícones, desenhos e ilustrações chapadas com poucas cores.`,
		icoPhoto: () => 'Não use ICO para fotos comuns: ele foi feito para ícones pequenos e quadrados.',
		pdfEdit: (A) => `Se quem recebe precisa editar ou reaproveitar a imagem, envie o próprio ${A}: tirar imagens de dentro de um PDF dá mais trabalho.`,
		keepLossless: (A, B) => `Para prints, textos, diagramas e logos com bordas nítidas, o ${A} pode continuar sendo a melhor escolha; o ${B}, com perda, pode borrar as letras em qualidades mais baixas.`,
		recompress: (A, B) => `Converter de um formato com perda para outro comprime a imagem duas vezes. Use qualidade alta e parta do ${A} original, não de uma cópia que já foi salva de novo.`,
		lossyGrow: (A, B) => `Se você só quer um arquivo menor, ${B} é o caminho errado: ele fica maior que o ${A} sem ficar mais bonito.`,
		heavy: (A, B) => `${B} não foi feito para a web: navegadores e aplicativos de mensagem lidam mal com ele. Use só quando um programa ou gráfica pedir.`,
		avifCompat: (A, B) => `Veja para onde o arquivo vai: ${B} é ótimo para sites, mas alguns programas, sistemas antigos e formulários ainda não abrem.`,
		generic: (A) => `Se o ${A} já funciona onde você precisa, não há motivo para converter. Cada conversão é uma oportunidade de mudar tamanho ou qualidade.`
	},
	faq: {
		heic: () => ({ q: 'Dá para converter fotos direto do iPhone?', a: 'Sim. Abra esta página no iPhone, escolha as fotos na galeria ou no app Arquivos e a conversão acontece no próprio celular. Arquivos HEIF também são aceitos.' }),
		psd: () => ({ q: 'As camadas do Photoshop são mantidas?', a: 'Não nesta conversão: o PSD é achatado numa única imagem, como aparece no Photoshop. Para trabalhar com as camadas, abra no editor online, que lê e exporta PSD com camadas.' }),
		anim: (A, B) => ({ q: `A animação do ${A} passa para o ${B}?`, a: `Não. O conversor lê o primeiro quadro do ${A}, então o ${B} é uma imagem parada desse quadro.` }),
		trace: (A) => ({ q: 'O SVG é vetor de verdade ou só uma imagem embutida?', a: `É vetor de verdade. O ${A} é traçado em caminhos SVG com o número de cores que você escolher, então dá para ampliar e editar no Illustrator, Inkscape ou Figma.` }),
		svgSize: (A, B) => ({ q: `Qual vai ser a resolução do ${B}?`, a: `Por padrão, o tamanho definido no ${A}. Use as opções de redimensionar para definir porcentagem ou pixels exatos; como a origem é vetorial, ampliar não borra.` }),
		pdf: (A) => ({ q: 'Como ficam as páginas no PDF?', a: `Cada imagem ${A} vai para uma página própria, na ordem da lista: dez imagens viram dez páginas.` }),
		ico: () => ({ q: 'Quais tamanhos ficam dentro do ICO?', a: 'Vários tamanhos padrão de ícone, de 16×16 a 256×256, num só arquivo. Serve como favicon.ico e como ícone do Windows.' }),
		alphaLost: (A, B) => ({ q: 'O que acontece com o fundo transparente?', a: `${B} não guarda transparência, então as áreas transparentes recebem a cor de fundo que você definir (branco por padrão). Use PNG ou WebP se precisar manter a transparência.` }),
		alphaKept: (A, B) => ({ q: 'A transparência é mantida?', a: `Sim. Pixels transparentes e semitransparentes do ${A} continuam transparentes no ${B}.` }),
		quality: (A, B) => ({ q: `Posso escolher a qualidade ou o tamanho do ${B}?`, a: 'Sim. Use o ajuste de qualidade ou digite um tamanho alvo em KB, e o conversor procura a maior qualidade que cabe nesse limite.' }),
		lossless: (A, B) => ({ q: `Converter para ${B} melhora a qualidade do meu ${A}?`, a: `Não. O ${B} evita novas perdas, mas o detalhe que a compressão do ${A} removeu não volta.` })
	},
	faqSize: (A, B) => `${B} fica menor que ${A}?`,
	faqBatch: (A, B) => ({ q: `Dá para converter vários ${A} para ${B} de uma vez?`, a: `Sim. Solte quantos arquivos ${A} quiser; eles são convertidos em paralelo e você baixa um por um, tudo num ZIP ou direto numa pasta.` }),
	general: {
		free: { q: 'É grátis mesmo?', a: 'Sim. Sem cadastro, sem marca d’água, sem limite diário e sem plano pago. É grátis porque todo o trabalho acontece no seu próprio aparelho.' },
		upload: { q: 'Minhas imagens são enviadas para algum servidor?', a: 'Não. Tudo roda no navegador, com Web Workers; os arquivos não saem do seu aparelho. Metadados como a localização GPS são removidos do resultado.' },
		batch: { q: 'Quantas imagens posso converter de uma vez?', a: 'Não há limite fixo. Os arquivos são processados em paralelo e o limite prático é a memória do seu aparelho.' },
		phone: { q: 'Funciona no iPhone e no Android?', a: 'Sim. Funciona em qualquer navegador moderno de celular, inclusive Safari no iPhone e Chrome no Android, sem instalar aplicativo.' }
	},
	steps: {
		add: (A) => `Arraste seus arquivos ${A} para o conversor acima ou toque para escolher. Dá para adicionar vários de uma vez.`,
		target: (A, B) => `${B} já vem selecionado como formato de saída nesta página.`,
		convert: (A, B) => `Converta e baixe cada ${B}, tudo num ZIP ou salve direto numa pasta (Chrome e Edge).`
	},
	opt: {
		quality: (A, B) => `Ajuste a qualidade do ${B} ou defina um tamanho alvo em KB.`,
		background: (A, B) => `Escolha a cor de fundo para as áreas transparentes (${B} não tem transparência).`,
		colors: () => 'Escolha o número de cores da vetorização.',
		icoSizes: () => 'Use uma imagem quadrada: os tamanhos do ícone até 256×256 são gerados automaticamente.',
		pdfPage: () => 'Ordene os arquivos na lista: cada imagem vira uma página.',
		resize: () => 'Se quiser, redimensione por porcentagem, para caber numa caixa ou em pixels exatos.'
	},
	hubs: {
		converter: {
			label: 'Conversor de imagens',
			title: 'Conversor de imagens online grátis e sem upload',
			description: 'Converta JPG, PNG, WebP, AVIF, HEIC, GIF, TIFF, PSD e SVG no navegador. Conversão em lote, compressão e redimensionamento, sem upload e sem cadastro.',
			h1: 'Conversor de imagens online e grátis',
			lead: 'Converta imagens entre 11 formatos de entrada e 11 de saída direto no navegador. Os arquivos são processados no seu aparelho, nunca enviados, e dá para converter uma pasta inteira de uma vez.',
			sections: [
				{ h2: 'Formatos que ele lê e gera', body: [
					'Entrada: JPG/JPEG, PNG, WebP, AVIF, GIF (primeiro quadro), BMP, ICO, SVG, HEIC/HEIF do iPhone, TIFF e PSD do Photoshop (achatado).',
					'Saída: JPG, PNG, WebP, AVIF, GIF, BMP, ICO com vários tamanhos para favicon, TIFF, PDF com uma página por imagem, SVG vetorial de verdade com número de cores ajustável e PSD.'
				] },
				{ h2: 'Opções que fazem diferença', body: [
					'Defina a qualidade de JPG, WebP e AVIF, ou informe um tamanho alvo em KB e deixe o conversor achar a melhor qualidade que cabe. Redimensione por porcentagem, para caber numa caixa ou em pixels exatos.',
					'Para formatos sem transparência você escolhe a cor de fundo. A orientação EXIF é respeitada e metadados como a localização GPS são removidos, para a foto não revelar onde foi tirada.'
				] },
				{ h2: 'Privado por padrão', body: [
					'A conversão roda em Web Workers dentro do navegador, em paralelo. Nada vai para servidor, então é seguro para documentos confidenciais e não existe fila nem limite diário.'
				] }
			],
			steps: [
				'Arraste as imagens para o conversor ou toque para escolher; pode misturar formatos.',
				'Escolha o formato de saída e, se precisar, qualidade, tamanho alvo ou redimensionamento.',
				'Converta e baixe cada arquivo, um ZIP com tudo ou salve direto numa pasta (Chrome e Edge).'
			],
			faq: [
				{ q: 'Qual formato escolher para um site?', a: 'WebP para arquivos pequenos com suporte amplo, AVIF para os menores arquivos em navegadores modernos e PNG para artes que precisam ficar perfeitas pixel a pixel.' },
				{ q: 'Dá para converter fotos HEIC do iPhone?', a: 'Sim. HEIC e HEIF são lidos direto no navegador e podem virar JPG, PNG, WebP ou PDF, sem a localização.' },
				{ q: 'Minhas imagens são enviadas?', a: 'Não. Tudo é processado localmente no navegador; os arquivos não saem do seu aparelho.' },
				{ q: 'Existe limite de arquivos?', a: 'Não há limite fixo. Os arquivos são convertidos em paralelo e o limite prático é a memória do aparelho.' }
			]
		},
		editor: {
			label: 'Editor de imagens online',
			title: 'Editor de imagens online com camadas, grátis',
			description: 'Editor de fotos online grátis inspirado no Paint.NET: camadas, modos de mesclagem, varinha mágica, remoção de fundo com IA, 39 filtros e texto 3D.',
			h1: 'Editor de imagens online com camadas',
			lead: 'Um editor de imagens completo no navegador, inspirado no Paint.NET: camadas, seleções, filtros, texto e formas, além de IA local para selecionar objetos. Nada é enviado.',
			sections: [
				{ h2: 'Camadas e seleções', body: [
					'Trabalhe com camadas, opacidade e modos de mesclagem, e mescle ou achate no final. Selecione com retângulo, elipse e laço, somando, subtraindo ou fazendo interseção.',
					'A varinha mágica tem cinco algoritmos, do preenchimento contíguo clássico a modos que respeitam bordas e agrupam cores, para seleções limpas em imagens difíceis.'
				] },
				{ h2: 'Filtros, texto e efeitos', body: [
					'39 filtros com prévia ao vivo: ajustes de cor, desfoques, nitidez, ruído, estilizar, distorcer e artísticos. Adicione texto com extrusão 3D, brilho neon, sombra e contorno, além de formas vetoriais editáveis.'
				] },
				{ h2: 'IA local e exportação', body: [
					'A seleção inteligente e a remoção de fundo usam modelos de IA baixados uma vez e executados no seu aparelho. Exporte PNG, JPG, WebP, AVIF, ICO, PSD com camadas ou SVG vetorial. No celular, funciona com toque e pinça para zoom.'
				] }
			],
			steps: [
				'Abra uma imagem (arraste, cole com Ctrl+V ou escolha o arquivo); PSD abre com as camadas.',
				'Edite com camadas, seleções, filtros, texto e formas.',
				'Exporte no formato que precisar, inclusive PSD com camadas e SVG vetorial.'
			],
			faq: [
				{ q: 'Preciso instalar alguma coisa?', a: 'Não. O editor roda em qualquer navegador moderno, no computador ou no celular.' },
				{ q: 'Ele abre arquivos do Photoshop?', a: 'Sim. Arquivos PSD abrem com as camadas e podem ser exportados de volta em PSD com camadas.' },
				{ q: 'Minhas imagens são enviadas?', a: 'Não. Edição, filtros e até os recursos de IA rodam no seu aparelho.' },
				{ q: 'Funciona no celular?', a: 'Sim. A interface se adapta ao toque, com barra de ferramentas embaixo e zoom com dois dedos.' }
			]
		},
		'remove-bg': {
			label: 'Remover fundo de imagem',
			title: 'Remover fundo de imagem grátis com IA local',
			description: 'Remova o fundo de fotos com IA que roda no seu aparelho. Sem upload, sem cadastro e sem marca d’água. Ajuste as bordas e exporte em PNG transparente.',
			h1: 'Remover fundo de imagem com IA no aparelho',
			lead: 'Recorte pessoas, produtos e objetos automaticamente. O modelo de IA é baixado uma vez e roda no navegador, então sua foto não sai do aparelho.',
			sections: [
				{ h2: 'Como funciona', body: [
					'Um modelo de segmentação identifica o objeto principal e transforma o fundo em transparência. Na primeira vez o modelo é baixado e fica guardado no navegador para as próximas.',
					'Usa WebGPU quando disponível e WebAssembly como alternativa, então funciona na maioria dos computadores e celulares recentes, só que mais rápido em uns do que em outros.'
				] },
				{ h2: 'Ajuste e exporte', body: [
					'O resultado abre no editor completo: corrija bordas com borracha ou pincel, refine com a varinha mágica ou a seleção inteligente, coloque uma nova cor ou imagem de fundo e exporte em PNG ou WebP transparente.'
				] }
			],
			steps: [
				'Abra a foto no editor (arraste, cole ou escolha o arquivo).',
				'Rode a remoção de fundo; o modelo é baixado uma vez e roda localmente.',
				'Retoque as bordas se precisar e exporte em PNG ou WebP transparente.'
			],
			faq: [
				{ q: 'Minha foto vai para algum servidor?', a: 'Não. Diferente da maioria dos removedores de fundo, a IA roda no seu aparelho; só os arquivos do modelo são baixados.' },
				{ q: 'Por que a primeira vez é mais lenta?', a: 'O modelo é baixado no primeiro uso. Depois fica guardado no navegador e inicia bem mais rápido.' },
				{ q: 'Tem marca d’água ou limite de resolução?', a: 'Sem marca d’água e sem plano pago para HD. Imagens grandes só demoram mais em aparelhos mais lentos.' }
			]
		},
		compress: {
			label: 'Comprimir imagem',
			title: 'Comprimir imagem em KB online, grátis e sem upload',
			description: 'Comprima imagens JPG, PNG, WebP e AVIF até um tamanho alvo em KB, direto no navegador. Compressão em lote, sem upload e sem metadados. Grátis.',
			h1: 'Comprimir imagens até o tamanho que você precisa',
			lead: 'Reduza fotos para formulários, e-mail e sites sem enviar para lugar nenhum. Defina um tamanho alvo em KB ou um nível de qualidade e comprima várias imagens de uma vez.',
			sections: [
				{ h2: 'Acerte o tamanho exato em KB', body: [
					'Muitos portais só aceitam arquivos abaixo de 100 KB, 200 KB ou 1 MB. Digite o limite e o compressor procura a maior qualidade que fica abaixo dele.',
					'Se a imagem continuar grande demais com uma qualidade razoável, reduza também as dimensões: diminuir largura e altura pela metade corta os pixels em quatro.'
				] },
				{ h2: 'Escolha o formato certo', body: [
					'WebP e AVIF geram arquivos bem menores que JPG com a mesma qualidade visual. Fique com JPG quando o destino não aceitar formatos modernos. PNG é sem perda, então quase não reduz fotos.',
					'Metadados como modelo da câmera e localização GPS são removidos, o que economiza alguns KB e protege sua privacidade.'
				] }
			],
			steps: [
				'Adicione suas imagens ao compressor; pode ser um lote.',
				'Defina o tamanho alvo em KB ou ajuste a qualidade e escolha o formato de saída.',
				'Comprima e baixe uma por uma, num ZIP ou numa pasta.'
			],
			faq: [
				{ q: 'Comprimir estraga a qualidade?', a: 'Em ajustes moderados a diferença é difícil de ver. O compressor mantém a maior qualidade que cabe no tamanho alvo.' },
				{ q: 'Dá para comprimir PNG sem mudar o formato?', a: 'PNG é sem perda, então a economia é limitada. Para reduzir muito, converta para WebP, que também mantém a transparência.' },
				{ q: 'Minhas imagens são enviadas?', a: 'Não. A compressão roda no navegador; os arquivos não saem do seu aparelho.' }
			]
		},
		resize: {
			label: 'Redimensionar imagem',
			title: 'Redimensionar imagem online grátis e em lote',
			description: 'Redimensione imagens por porcentagem, para caber numa caixa ou em pixels exatos, no navegador. Em lote, para JPG, PNG, WebP, HEIC e mais. Sem upload.',
			h1: 'Redimensionar imagens online',
			lead: 'Mude as dimensões de uma imagem ou de cem de uma vez. Escolha porcentagem, uma caixa máxima ou largura e altura exatas, e converta o formato no mesmo passo.',
			sections: [
				{ h2: 'Três jeitos de redimensionar', body: [
					'Porcentagem escala tudo por igual, por exemplo 50% para metade do tamanho. Caber numa caixa mantém a proporção dentro de uma largura e altura máximas, ideal para lotes de fotos variadas. Exato define as dimensões em pixels.',
					'A orientação EXIF é aplicada antes, então fotos em pé mantêm o formato certo.'
				] },
				{ h2: 'Redimensione e converta juntos', body: [
					'Combine o redimensionamento com qualquer formato de saída e qualidade: por exemplo, transforme fotos HEIC do iPhone em JPG de 1600 px com menos de 300 KB numa passada só.'
				] }
			],
			steps: [
				'Adicione as imagens que quer redimensionar.',
				'Escolha porcentagem, caber numa caixa ou pixels exatos, além do formato de saída.',
				'Converta e baixe as imagens redimensionadas, num ZIP se preferir.'
			],
			faq: [
				{ q: 'Redimensionar mantém a proporção?', a: 'Porcentagem e caixa sempre mantêm. No tamanho exato você define as duas dimensões livremente.' },
				{ q: 'Dá para aumentar imagens?', a: 'Sim, mas ampliar uma foto não cria detalhe de verdade; a exceção é o SVG, que continua nítido.' },
				{ q: 'As imagens são enviadas?', a: 'Não. O redimensionamento acontece no navegador.' }
			]
		}
	}
};
