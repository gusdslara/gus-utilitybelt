// Textos em português (pt-BR) das páginas de SEO do app Motion (visualizador, editor e criador de Lottie).
import type { MotionCopy } from './types.ts';

export const motionPt: MotionCopy = {
	pages: {
		'lottie-viewer': {
			label: 'Visualizador de Lottie',
			title: 'Visualizador de Lottie Online — Abra JSON e .lottie',
			description: 'Abra arquivos Lottie JSON e dotLottie no navegador: reproduza, pause, avance quadro a quadro, mude velocidade e fundo e veja fps, quadros e camadas.',
			h1: 'Visualizador e player de Lottie online',
			lead: 'Arraste um .json do Bodymovin/Lottie ou um arquivo .lottie e ele começa a tocar na hora. Confira cada quadro, teste em fundo claro e escuro e veja os detalhes técnicos antes de colocar no app ou no site.',
			sections: [
				{ h2: 'O que o visualizador de Lottie faz', body: [
					'Lottie é o formato de animação vetorial exportado do After Effects pelo plugin Bodymovin, e o dotLottie (.lottie) é a versão compactada, com imagens e várias animações num arquivo só. O visualizador toca os dois sem instalar nada.',
					'É o jeito mais rápido de responder às dúvidas de quem vai publicar: o arquivo abre, quanto dura, quanto pesa e fica bem no fundo onde vai ser usado?'
				] },
				{ h2: 'Como o player funciona', body: [
					'Dê play, pause e arraste a linha do tempo para navegar quadro a quadro, ou avance um quadro por vez. Mude a velocidade, ligue ou desligue o loop e troque o fundo entre transparente, branco, preto ou qualquer cor.',
					'O painel de informações mostra tamanho da tela, taxa de quadros, total de quadros, duração e a lista de camadas, incluindo precomps, para achar rápido o que está pesado ou escondido.'
				] }
			],
			steps: [
				'Arraste um arquivo .json ou .lottie para a página, ou toque para escolher.',
				'Dê play, pause ou arraste a linha do tempo para ver qualquer quadro.',
				'Teste velocidades, loop e fundos diferentes.',
				'Confira tamanho, fps, quadros, duração e camadas no painel de informações.',
				'Se quiser, edite ou exporte como GIF, MP4, WebM ou dotLottie.'
			],
			faq: [
				{ q: 'Por que meu Lottie fica diferente do After Effects?', a: 'O Lottie suporta só parte do After Effects. Efeitos, alguns modos de mesclagem, camadas 3D e expressões não são exportados ou são ignorados pelos players, então o que você vê aqui é próximo do que os players web e mobile mostram.' },
				{ q: 'Dá para ver quais camadas deixam o arquivo pesado?', a: 'Sim. A lista mostra todas as camadas e precomps, e imagens embutidas costumam ser as culpadas quando um Lottie passa de centenas de kilobytes.' }
			]
		},
		'lottie-editor': {
			label: 'Editor de Lottie',
			title: 'Editor de Lottie Online — Cores, Textos e Camadas',
			description: 'Edite animações Lottie online: troque as cores do arquivo todo, reescreva textos, oculte ou remova camadas, corte quadros, mude a velocidade e a tela.',
			h1: 'Editor de Lottie online',
			lead: 'Ajuste uma animação Lottie sem abrir o After Effects. Troque as cores para as da sua marca, corrija um texto, tire uma camada que não serve e exporte um novo JSON ou .lottie em um minuto.',
			sections: [
				{ h2: 'Edite Lottie sem After Effects', body: [
					'A maioria dos Lottie vem de um designer ou de uma biblioteca, e mudanças pequenas costumam exigir voltar ao projeto original. Este editor trabalha direto no JSON exportado, então você mesmo faz os ajustes comuns.',
					'Cada mudança é aplicada aos dados da animação, não a um vídeo: o resultado continua um Lottie vetorial, leve e nítido, que você pode editar de novo depois.'
				] },
				{ h2: 'Cores, textos e camadas', body: [
					'O editor extrai a paleta usada no arquivo. Troque uma cor e todas as formas que a usam mudam juntas, perfeito para aplicar a cor da marca ou criar uma versão para modo escuro.',
					'Camadas de texto podem ser reescritas no lugar, e qualquer camada ou precomp pode ser ocultada ou removida. Errou? O desfazer volta passo a passo.'
				] }
			],
			steps: [
				'Abra o arquivo .json ou .lottie no editor.',
				'Escolha uma cor da paleta extraída e troque em todo o arquivo.',
				'Reescreva textos e oculte ou remova as camadas que não precisa.',
				'Ajuste velocidade e fps, corte o intervalo de quadros ou redimensione a tela.',
				'Exporte como Lottie JSON, dotLottie, GIF ou vídeo.'
			],
			faq: [
				{ q: 'Dá para trocar a cor de um elemento só?', a: 'A paleta troca a cor em todos os lugares onde ela aparece. Para mudar um elemento só, oculte os outros ou edite essa camada na linha do tempo do criador.' },
				{ q: 'O arquivo editado continua um Lottie normal?', a: 'Sim. A exportação é Lottie JSON ou dotLottie padrão, compatível com lottie-web, lottie-ios, lottie-android, players dotLottie e LottieFiles.' }
			]
		},
		'lottie-maker': {
			label: 'Criar animação Lottie',
			title: 'Criar Animação Lottie Online — Grátis, no Navegador',
			description: 'Crie animações Lottie no navegador com linha do tempo, keyframes, easing, formas, texto e mais de 30 presets. Exporte JSON, .lottie, GIF ou MP4. Grátis.',
			h1: 'Crie animações Lottie online',
			lead: 'Um editor de motion no navegador para ícones, logos, loaders e vídeos curtos para redes sociais. Monte na linha do tempo com keyframes ou comece por um preset ou modelo e exporte um Lottie de verdade ou um vídeo.',
			sections: [
				{ h2: 'Um editor de motion feito para Lottie', body: [
					'Adicione camadas de forma (retângulo, elipse, estrela, polígono ou caminhos de um SVG seu), camadas de texto e imagens, e anime posição, escala, rotação, opacidade e cores numa linha do tempo com keyframes.',
					'Cada keyframe tem seu easing: linear, ease in, ease out, ease in-out, back, elástico, bounce ou hold. É isso que deixa o movimento natural em vez de robótico.'
				] },
				{ h2: 'Presets e modelos', body: [
					'Mais de 30 presets de um clique cobrem os clássicos: fade, slide, pop, zoom, giro, bounce, desenhar traço, máquina de escrever, pulso, tremida, wiggle, batimento cardíaco e loops contínuos.',
					'Modelos prontos dão uma base para adaptar: revelação de logo, lower third, spinner de carregamento, coração de curtida, badge de notificação e texto em máquina de escrever.'
				] }
			],
			steps: [
				'Comece com a tela em branco, um modelo ou um SVG importado.',
				'Adicione formas, textos ou imagens como camadas.',
				'Aplique um preset ou defina keyframes e easing na linha do tempo.',
				'Veja o loop na prévia e ajuste o tempo.',
				'Exporte como Lottie JSON, dotLottie, GIF, MP4, WebM ou PNG.'
			],
			faq: [
				{ q: 'Preciso saber After Effects?', a: 'Não. Presets e modelos geram uma animação completa em um clique, e a linha do tempo usa as mesmas ideias de keyframe e easing de qualquer ferramenta de motion.' },
				{ q: 'Posso importar meu logo?', a: 'Sim. Importe um SVG e os caminhos viram camadas de forma que você anima, recolore e desenha traço a traço.' }
			]
		},
		'lottie-to-gif': {
			label: 'Lottie para GIF',
			title: 'Converter Lottie para GIF — GIF Transparente, Sem Upload',
			description: 'Converta animações Lottie JSON ou .lottie em GIF no navegador, com fundo transparente, tamanho, fps e loop ajustáveis. Sem upload e sem marca d’água.',
			h1: 'Converter Lottie para GIF',
			lead: 'Transforme uma animação Lottie em GIF para lugares que não tocam Lottie: e-mail, apps de conversa, documentação, slides e CMS antigos. Mantenha o fundo transparente ou escolha uma cor.',
			sections: [
				{ h2: 'Por que converter Lottie em GIF', body: [
					'O Lottie precisa de uma biblioteca de player, então não funciona em e-mail, mensagens do Slack ou Teams, README, Notion e na maioria das ferramentas de apresentação. O GIF toca em qualquer lugar, sem código.',
					'Converter localmente também significa que sua animação ainda não lançada não sai do seu aparelho, o que importa em trabalho para clientes e lançamentos.'
				] },
				{ h2: 'Como o GIF é gerado', body: [
					'Cada quadro do Lottie é desenhado no navegador e codificado em GIF com uma paleta de cores otimizada. Você escolhe tamanho, taxa de quadros, loop e fundo.',
					'Com fundo transparente, o GIF mantém transparência de liga/desliga e fica limpo sobre páginas coloridas. As bordas suaves são combinadas com uma cor de fundo escolhida para evitar halo escuro.'
				] }
			],
			steps: [
				'Abra o arquivo .json ou .lottie.',
				'Confira a prévia e, se precisar, corte quadros ou mude a velocidade.',
				'Abra Exportar e escolha GIF (já vem selecionado nesta página).',
				'Defina tamanho, fps, loop e fundo transparente ou sólido.',
				'Exporte e baixe o GIF.'
			],
			faq: [
				{ q: 'Por que o GIF ficou maior que o Lottie?', a: 'O Lottie guarda instruções vetoriais; o GIF guarda cada quadro em pixels, com no máximo 256 cores. Reduza tamanho ou fps, ou corte quadros, para diminuir.' },
				{ q: 'Dá para o GIF tocar uma vez só?', a: 'Sim. Desligue o loop nas opções de exportação e o GIF para no último quadro.' }
			]
		},
		'lottie-to-mp4': {
			label: 'Lottie para MP4',
			title: 'Converter Lottie para MP4 — Vídeo H.264 no Navegador',
			description: 'Converta animações Lottie e dotLottie em MP4 (H.264) direto no navegador para Instagram, TikTok, Reels e slides. Escolha tamanho, fps e cor de fundo.',
			h1: 'Converter Lottie para vídeo MP4',
			lead: 'Exporte qualquer Lottie como vídeo MP4, aceito por todo celular, rede social e editor de vídeo. Ideal para stories, reels, apresentações e edição.',
			sections: [
				{ h2: 'Por que transformar Lottie em MP4', body: [
					'Redes sociais, apps de mensagem e editores de vídeo aceitam arquivos de vídeo, não JSON de Lottie. MP4 com H.264 é o formato de vídeo mais compatível que existe, do Instagram e TikTok ao PowerPoint, Keynote e Premiere.',
					'Vídeo também fica menor que GIF em animações longas ou coloridas, com milhões de cores e degradês suaves em vez de uma paleta de 256 cores.'
				] },
				{ h2: 'Como o MP4 é codificado', body: [
					'Os quadros são renderizados a partir do Lottie e codificados em H.264 com WebCodecs, o codificador de vídeo embutido nos navegadores modernos. É rápido, costuma usar aceleração por hardware e nada vai para servidor.',
					'Escolha resolução, taxa de quadros e cor de fundo, já que MP4 não tem transparência. Para um story vertical, redimensione a tela para 1080×1920 antes de exportar.'
				] }
			],
			steps: [
				'Abra seu arquivo Lottie .json ou .lottie.',
				'Redimensione a tela se precisar de vídeo quadrado, vertical ou largo.',
				'Abra Exportar; o MP4 já vem selecionado nesta página.',
				'Escolha resolução, fps e cor de fundo.',
				'Exporte e baixe o MP4.'
			],
			faq: [
				{ q: 'Dá para exportar vídeo vertical para Stories e Reels?', a: 'Sim. Redimensione a tela para 1080×1920 (9:16), posicione a animação e exporte em MP4.' },
				{ q: 'O MP4 tem som?', a: 'Não. Animações Lottie não têm faixa de áudio, então o vídeo sai mudo. Adicione música depois no editor de vídeo ou na rede social.' }
			]
		},
		'lottie-to-webm': {
			label: 'Lottie para WebM',
			title: 'Converter Lottie para WebM — Grátis, no Navegador',
			description: 'Converta arquivos Lottie JSON e .lottie em vídeo WebM no navegador. Arquivos leves para sites e loops automáticos, com tamanho e fps à escolha. Sem upload.',
			h1: 'Converter Lottie para WebM',
			lead: 'Exporte um Lottie como vídeo WebM, o formato aberto de vídeo da web que os navegadores tocam nativamente numa tag video muda e em loop, sem biblioteca de player Lottie.',
			sections: [
				{ h2: 'Quando o WebM é a melhor escolha', body: [
					'Se você quer uma animação no site mas não quer carregar um player de Lottie, um WebM curto e mudo numa tag video com autoplay e loop é leve, fluido e suportado por todo navegador moderno.',
					'O WebM usa os codecs VP8/VP9 e costuma gerar arquivos menores que o GIF, com cores muito melhores, o que ajuda na velocidade da página e nas Core Web Vitals.'
				] },
				{ h2: 'Como funciona a exportação em WebM', body: [
					'O Lottie é renderizado quadro a quadro no navegador e codificado localmente. Você escolhe tamanho de saída, taxa de quadros e fundo e baixa o arquivo .webm.',
					'Para alcançar todo mundo, publique o WebM junto com um MP4 de reserva: versões antigas do Safari e muitos programas de desktop preferem MP4.'
				] }
			],
			steps: [
				'Abra o arquivo Lottie .json ou .lottie.',
				'Corte quadros ou mude a velocidade se o loop estiver longo.',
				'Abra Exportar; o WebM já vem selecionado nesta página.',
				'Escolha tamanho, fps e fundo.',
				'Exporte e use o .webm numa tag video muda e em loop.'
			],
			faq: [
				{ q: 'WebM toca no iPhone?', a: 'Versões recentes do Safari tocam WebM, mas iPhones e iPads mais antigos não. Ofereça um MP4 de reserva na mesma tag video por garantia.' },
				{ q: 'WebM ou Lottie no meu site?', a: 'O Lottie fica nítido em qualquer tamanho e pode ser interativo, mas precisa de um script de player. O WebM dispensa script e é melhor para cenas complexas e coloridas.' }
			]
		},
		'json-to-lottie': {
			label: 'JSON para dotLottie',
			title: 'Converter JSON para Lottie (.lottie) Online',
			description: 'Converta Lottie JSON (Bodymovin) em um arquivo dotLottie (.lottie) compacto no navegador, ou extraia um .lottie de volta para JSON. Grátis e sem cadastro.',
			h1: 'Converter Lottie JSON para dotLottie',
			lead: 'Empacote um JSON do Bodymovin e suas imagens num único arquivo .lottie comprimido, ou abra um .lottie e salve de novo como JSON. Tudo roda no seu navegador.',
			sections: [
				{ h2: 'JSON ou dotLottie', body: [
					'Um Lottie JSON é texto puro: fácil de inspecionar e aceito por todo player, mas as imagens precisam ir embutidas em base64 ou em arquivos separados. O dotLottie (.lottie) é um ZIP com o JSON, as imagens e um manifesto.',
					'Graças à compressão, um .lottie costuma ficar de 50% a 80% menor que o mesmo JSON e mantém tudo junto num arquivo fácil de compartilhar e guardar em cache.'
				] },
				{ h2: 'Como a conversão funciona', body: [
					'Abra o JSON e exporte como dotLottie: dados da animação e imagens são empacotados e comprimidos localmente. No caminho inverso, abra um .lottie e exporte Lottie JSON para recuperar os dados originais.',
					'Você também pode ajustar a animação antes de salvar: troque cores, textos, velocidade ou tamanho da tela no editor e exporte no formato que precisar.'
				] }
			],
			steps: [
				'Solte seu Lottie .json (ou um .lottie para extrair).',
				'Confira a prévia e edite o que for preciso.',
				'Abra Exportar; o dotLottie já vem selecionado nesta página.',
				'Escolha dotLottie para empacotar ou Lottie JSON para extrair.',
				'Baixe o arquivo convertido.'
			],
			faq: [
				{ q: 'Todo player aceita .lottie?', a: 'Os players dotLottie (web, iOS, Android, React, Flutter) e o LottieFiles aceitam. Projetos antigos que usam só lottie-web precisam do JSON puro, que você também exporta aqui.' },
				{ q: 'A conversão muda a animação?', a: 'Não. Empacotar em dotLottie só comprime os mesmos dados e imagens, então a reprodução é idêntica.' }
			]
		},
		'text-animation': {
			label: 'Animar texto',
			title: 'Animar Texto Online — Máquina de Escrever e Mais',
			description: 'Crie texto animado online: máquina de escrever, fade, slide e escala letra por letra, com easing e loop. Exporte em Lottie, GIF, MP4 ou WebM. Sem marca d’água.',
			h1: 'Animar texto online',
			lead: 'Transforme uma palavra, um título ou uma frase em movimento. Anime o texto letra por letra, escolha o easing e exporte um Lottie leve para o site ou um vídeo para as redes.',
			sections: [
				{ h2: 'Animação de texto letra por letra', body: [
					'Digite o texto e escolha como cada caractere aparece: máquina de escrever, fade, slide de qualquer lado ou escala. Um atraso entre as letras cria o efeito escalonado clássico de títulos e aberturas.',
					'Combine com a linha do tempo: segure o texto na tela e depois anime a saída da linha inteira, ou faça um loop para um banner. Easings como back e elástico dão um quique divertido.'
				] },
				{ h2: 'Ideias para texto animado', body: [
					'Use em títulos de stories, lower thirds no YouTube, chamadas no topo do site, aberturas de apresentação, frases no Instagram ou um efeito de máquina de escrever numa demo de produto.',
					'Comece pelos modelos de texto em máquina de escrever ou lower third e troque as palavras, ou monte o seu do zero com camadas de texto e formas.'
				] }
			],
			steps: [
				'Abra o animador de texto ou um modelo de texto.',
				'Digite o texto e escolha tamanho, cor e alinhamento.',
				'Escolha a animação por letra: máquina de escrever, fade, slide ou escala.',
				'Ajuste tempo e easing na linha do tempo.',
				'Exporte em Lottie, GIF, MP4 ou WebM.'
			],
			faq: [
				{ q: 'Dá para animar palavra por palavra?', a: 'Os presets trabalham por caractere. Para animar palavra por palavra, coloque cada palavra numa camada de texto e desloque os keyframes na linha do tempo.' },
				{ q: 'O texto continua editável depois de exportar?', a: 'Em Lottie JSON e dotLottie o texto continua sendo texto, então dá para reabrir e mudar. Em GIF e vídeo ele vira pixels.' }
			]
		}
	},
	sections: {
		edit: { h2: 'O que dá para mudar', body: [
			'Troque as cores da animação inteira pela paleta extraída, reescreva textos, oculte ou remova camadas e precomps, mude velocidade ou fps, corte o intervalo de quadros e redimensione a tela. Tudo pode ser desfeito.',
			'Para mudanças maiores, abra o criador: linha do tempo com keyframes e easing, camadas de forma, texto e imagem e mais de 30 presets de animação.'
		] },
		export: { h2: 'Formatos de exportação e usos', body: [
			'Exporte Lottie JSON ou dotLottie para sites e apps, GIF com transparência para e-mail e conversas, MP4 (H.264) para Instagram, TikTok, stories e apresentações, WebM para loops leves na web, sequência PNG em ZIP ou um quadro único em PNG ou SVG.',
			'A mesma animação pode ir para a página de um produto, uma tela de onboarding no app, um post nas redes e um slide, cada um no formato certo.'
		] },
		tips: { h2: 'Dicas de desempenho e tamanho de arquivo', body: [
			'Imagens embutidas costumam ser a parte mais pesada de um Lottie: prefira formas vetoriais, ou use dotLottie para comprimir os arquivos. Menos camadas e loops mais curtos também rodam melhor em celulares simples.',
			'No GIF, reduza primeiro as dimensões e o fps: passar de 60 para 30 fps corta o arquivo quase pela metade. Em vídeo, 30 fps e o tamanho real de exibição bastam para a maioria dos usos em redes e na web.'
		] },
		choose: { h2: 'GIF, MP4 ou Lottie: qual usar', body: [
			'Lottie (JSON ou .lottie) é a melhor escolha dentro de sites e apps: pequeno, nítido em qualquer tamanho e controlável por código. GIF é para lugares que só mostram imagens, como e-mail e conversas, e é o único dos três com transparência que toca em qualquer lugar.',
			'MP4 é para redes sociais, mensagens e apresentações: milhões de cores, arquivos pequenos e sem transparência. WebM é a opção de vídeo leve para páginas web.'
		] }
	},
	faq: {
		dotlottie: { q: 'Aceita arquivos .lottie (dotLottie)?', a: 'Sim. Abre tanto .json do Bodymovin/Lottie quanto .lottie do dotLottie, e exporta nos dois formatos.' },
		expressions: { q: 'Expressões do After Effects funcionam?', a: 'Não. Expressões não são avaliadas, como na maioria dos players de Lottie; os valores estáticos são usados. Efeitos, camadas 3D e alguns modos de mesclagem também não fazem parte do Lottie.' },
		fonts: { q: 'Que fontes as camadas de texto usam?', a: 'As camadas de texto são desenhadas com as fontes instaladas no seu sistema. Se a fonte original não existir, entra uma parecida, então converta textos críticos em formas antes de exportar.' },
		gifAlpha: { q: 'O GIF pode ter fundo transparente?', a: 'Sim. Escolha fundo transparente ao exportar. A transparência do GIF é liga/desliga por pixel, então as bordas suaves são misturadas com uma cor de fundo que você escolhe.' },
		webcodecs: { q: 'Por que exportar MP4 exige navegador moderno?', a: 'O MP4 é codificado com WebCodecs, disponível nas versões atuais de Chrome, Edge, Safari e Firefox. Em navegadores antigos, exporte WebM, GIF ou sequência PNG.' },
		privacy: { q: 'Minhas animações são enviadas para algum servidor?', a: 'Não. Abrir, editar, renderizar e codificar acontece no seu navegador. Os arquivos não saem do seu aparelho, então é seguro para trabalhos ainda não lançados.' },
		phone: { q: 'Funciona no celular?', a: 'Sim. Dá para abrir, tocar, editar e exportar animações Lottie no iPhone e no Android em qualquer navegador moderno.' },
		free: { q: 'É grátis? Tem marca d’água?', a: 'É totalmente grátis, sem cadastro, sem marca d’água e sem limite de exportações.' }
	}
};
