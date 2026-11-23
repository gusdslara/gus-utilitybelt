import { ns } from './ns.ts';

// Editor de imagens (app "Imagem"): menus, ferramentas, opções, painéis, diálogos, avisos e histórico.
export default ns({
	pt: {
		title: 'Editor de imagens', untitled: 'Sem título', unsaved: 'alterações não exportadas', canvasLabel: 'Tela de desenho',
		confirmDiscard: 'Há alterações não exportadas. Descartar e continuar?', textPlaceholder: 'Digite o texto…',
		menu: { file: 'Arquivo', edit: 'Editar', select: 'Seleção', image: 'Imagem', layers: 'Camadas', adjust: 'Ajustes', effects: 'Efeitos', ai: 'IA', view: 'Exibir' },
		cmd: {
			new: 'Nova imagem…', open: 'Abrir…', openLayer: 'Abrir como camada…', export: 'Exportar', undo: 'Desfazer', redo: 'Refazer',
			cut: 'Recortar', copy: 'Copiar', copyMerged: 'Copiar mesclado', paste: 'Colar', pasteNewLayer: 'Colar em nova camada', pasteNewImage: 'Colar em nova imagem',
			delete: 'Apagar seleção', fillSelection: 'Preencher seleção', shortcuts: 'Atalhos de teclado', selectAll: 'Selecionar tudo', deselect: 'Desmarcar',
			invert: 'Inverter seleção', invertSelection: 'Inverter seleção', selectAlpha: 'Selecionar conteúdo da camada', selectByColor: 'Selecionar por cor',
			feather: 'Suavizar borda…', grow: 'Expandir…', shrink: 'Contrair…', harden: 'Endurecer borda', selectSubject: 'Selecionar sujeito (IA)',
			aiSelect: 'Seleção inteligente (IA)', removeBg: 'Remover fundo (IA)', clearAiCache: 'Apagar modelos de IA baixados',
			cropToSelection: 'Recortar para a seleção', autoCrop: 'Cortar bordas vazias', resize: 'Redimensionar imagem…', canvasSize: 'Tamanho da tela…',
			rotCw: 'Girar 90° horário', rotCcw: 'Girar 90° anti-horário', rot180: 'Girar 180°', flipH: 'Espelhar horizontal', flipV: 'Espelhar vertical',
			flatten: 'Achatar', addLayer: 'Nova camada', duplicateLayer: 'Duplicar camada', deleteLayer: 'Apagar camada', mergeDown: 'Mesclar para baixo',
			layerFromSelection: 'Camada via cópia', layerViaCut: 'Camada via recorte', layerFlipH: 'Espelhar camada (horizontal)', layerFlipV: 'Espelhar camada (vertical)',
			layerRot180: 'Girar camada 180°', layerUp: 'Subir camada', layerDown: 'Descer camada', rasterize: 'Rasterizar camada', bakeEffects: 'Aplicar efeitos (rasterizar)',
			zoomIn: 'Aumentar zoom', zoomOut: 'Diminuir zoom', fit: 'Ajustar à janela', actualSize: 'Tamanho real (100%)', pixelGrid: 'Grade de pixels',
			repeatFilter: 'Repetir', expandCanvas: 'Expandir tela'
		},
		tools: {
			move: 'Mover', 'select-rect': 'Seleção retangular', 'select-ellipse': 'Seleção elíptica', 'select-lasso': 'Laço', wand: 'Varinha mágica', crop: 'Recortar',
			brush: 'Pincel', eraser: 'Borracha', fill: 'Balde de tinta', gradient: 'Gradiente', picker: 'Conta-gotas', text: 'Texto', shape: 'Formas',
			clone: 'Carimbo', hand: 'Mão (mover vista)', zoom: 'Zoom'
		},
		toolHints: {
			move: 'Arraste para mover; alças redimensionam e giram (Shift mantém proporção). Setas movem 1 px.',
			text: 'Clique na imagem para escrever; arraste a caixa para mover.',
			hand: 'Arraste para mover a vista. Pinça ou Ctrl + roda dá zoom.',
			zoom: 'Clique para aproximar; Alt + clique ou botão direito para afastar.'
		},
		selMode: { replace: 'Substituir', add: 'Somar (Shift)', subtract: 'Subtrair (Alt)', intersect: 'Interseção (Shift+Alt)' },
		wandEngine: { classic: 'Clássica', sam: 'IA: clique no objeto', subject: 'IA: sujeito' },
		wandAlgo: { flood: 'Contígua (4 vizinhos)', flood8: 'Contígua (8 vizinhos)', global: 'Global (cor na imagem toda)', edge: 'Para nas bordas (Sobel)', cluster: 'Agrupamento k-means (ML)' },
		wandMetric: { rgb: 'RGB', rgba: 'RGB + alfa', lab: 'Perceptual (ΔE Lab)', hue: 'Só matiz', luma: 'Só brilho', max: 'Maior diferença por canal' },
		opt: {
			selectMode: 'Modo de seleção', feather: 'Suavizar', antialias: 'Antisserrilhado', engine: 'Motor', algorithm: 'Algoritmo', metric: 'Cor por',
			tolerance: 'Tolerância', clusters: 'Grupos', contiguous: 'Contígua', edge: 'Força da borda', sample: 'Amostra', sampleLayer: 'Camada', sampleImage: 'Imagem',
			aiLocal: 'IA local', model: 'Modelo', size: 'Tamanho', hardness: 'Dureza', opacity: 'Opacidade', flow: 'Fluxo', smoothing: 'Suavização', pressure: 'Pressão da caneta',
			setSource: 'Definir origem (Alt+clique)', type: 'Tipo', toTransparent: 'Até transparente', reverse: 'Inverter cores', sampleSize: 'Área',
			shape: 'Forma', style: 'Estilo', strokeWidth: 'Espessura', radius: 'Raio', sides: 'Lados', inner: 'Raio interno', dash: 'Tracejado',
			font: 'Fonte', fontSize: 'Tamanho', weight: 'Peso', italic: 'Itálico', align: 'Alinhamento', aspect: 'Proporção', applyCrop: 'Recortar',
			moveMode: 'Mover', commit: 'Concluir'
		},
		gradient: { linear: 'Linear', radial: 'Radial', conic: 'Cônico', reflected: 'Refletido' },
		shapeMode: { fill: 'Preenchida', stroke: 'Contorno', both: 'Ambos' },
		shapes: { rect: 'Retângulo', roundrect: 'Retângulo arredondado', ellipse: 'Elipse', line: 'Linha', arrow: 'Seta', triangle: 'Triângulo', polygon: 'Polígono', star: 'Estrela', heart: 'Coração', speech: 'Balão de fala' },
		align: { left: 'Esquerda', center: 'Centro', right: 'Direita' },
		aspect: { free: 'Livre', original: 'Original' },
		moveMode: { pixels: 'Pixels', selection: 'Só a seleção' },
		paint: { none: 'Nenhum', solid: 'Sólido', linear: 'Linear', radial: 'Radial' },
		panels: { tools: 'Ferramentas', options: 'Opções da ferramenta', layers: 'Camadas', colors: 'Cores', history: 'Histórico', properties: 'Propriedades', label: 'Painéis' },
		layer: { blend: 'Mesclagem', hide: 'Ocultar camada', show: 'Mostrar camada', lock: 'Bloquear camada', unlock: 'Desbloquear camada', text: 'Texto', pasted: 'Colado', fromSelection: 'Da seleção', background: 'Fundo', layer: 'Camada', copySuffix: 'cópia' },
		blends: {
			'source-over': 'Normal', multiply: 'Multiplicar', screen: 'Tela', overlay: 'Sobrepor', darken: 'Escurecer', lighten: 'Clarear', 'color-dodge': 'Subexpor cor',
			'color-burn': 'Superexpor cor', 'hard-light': 'Luz forte', 'soft-light': 'Luz suave', difference: 'Diferença', exclusion: 'Exclusão', hue: 'Matiz',
			saturation: 'Saturação', color: 'Cor', luminosity: 'Luminosidade'
		},
		color: {
			primary: 'Primária', secondary: 'Secundária', swap: 'Trocar cores', reset: 'Preto e branco', editing: 'Cor em edição', eyedropper: 'Pegar cor da tela',
			satValue: 'Saturação e brilho', hue: 'Matiz', alpha: 'Transparência', palette: 'Paleta', addSwatch: 'Adicionar cor à paleta', resetPalette: 'Restaurar paleta',
			recent: 'Recentes', swatchHint: 'clique: cor em edição · botão direito: a outra · Shift+direito: remover'
		},
		props: {
			text: 'Texto', shape: 'Forma', fill: 'Preenchimento', stroke: 'Contorno', color: 'Cor', from: 'De', to: 'Para', angle: 'Ângulo', enabled: 'Ativo',
			lineHeight: 'Altura da linha', letterSpacing: 'Espaçamento', rotation: 'Rotação', quickStyles: 'Estilos rápidos', effects: 'Efeitos de camada'
		},
		presets: { none: 'Sem efeitos', classic3d: '3D clássico', neon: 'Neon', outline: 'Contorno', longShadow: 'Sombra longa', retro: 'Retrô', soft: 'Sombra suave' },
		fx: { extrude: 'Extrusão 3D', shadow: 'Sombra', glow: 'Brilho externo', outline: 'Contorno', depth: 'Profundidade', shade: 'Sombreamento', blur: 'Desfoque', strength: 'Intensidade' },
		dlg: {
			width: 'Largura', height: 'Altura', background: 'Fundo', bg: { white: 'Branco', transparent: 'Transparente', primary: 'Cor primária', secondary: 'Cor secundária' },
			fromImage: 'Já tem a imagem? Cole com Ctrl+V ou arraste para cá.', fromImageDrop: 'Solte para abrir a imagem', pasteClip: 'Colar do clipboard', openFile: 'Abrir arquivo', memory: '~{mb} MB por camada', create: 'Criar', byPixels: 'Por pixels', byPercent: 'Por porcentagem', percent: 'Porcentagem', keepAspect: 'Manter proporção',
			resample: 'Reamostragem', quality: { label: 'Qualidade', high: 'Alta (melhor)', medium: 'Média', low: 'Baixa (rápida)', pixel: 'Vizinho mais próximo (pixel art)' },
			anchor: 'Âncora', apply: 'Aplicar', format: 'Formato', unsupported: 'Este navegador não consegue gerar este formato.', layers: 'camadas', vector: 'vetor',
			lossy: 'com perdas', lossless: 'sem perdas', icoSizes: 'Tamanhos do ícone', scale: 'Escala', svgEmbed: 'Incluir camadas raster (imagens)', save: 'Salvar',
			amount: 'Quantidade', cores: 'núcleos', heavyFilter: 'Filtro pesado em {mp} MP: pode levar alguns segundos. Dá para parar a qualquer momento.',
			noParams: 'Sem ajustes: é só aplicar.', previewing: 'Gerando prévia…', previewScaled: 'Prévia em {pct}% da resolução; aplicar usa a resolução total.',
			reset: 'Padrões', compare: 'Original', compareHint: 'Segure para ver o original'
		},
		newPresets: { hd: 'Full HD', square: 'Quadrado', story: 'Story', post45: 'Post 4:5', og: 'Link (OG)', a4: 'A4 300 dpi', icon: 'Ícone', banner: 'Banner' },
		formatHints: {
			png: 'Sem perdas, com transparência. Ideal para web, prints e artes.', jpeg: 'Fotos com arquivo pequeno. Sem transparência.',
			webp: 'Moderno: menor que PNG/JPEG, com transparência.', avif: 'O mais compacto, com transparência. Codificação depende do navegador.',
			bmp: 'Bitmap sem compressão (compatibilidade).', ico: 'Ícone do Windows/favicon com vários tamanhos.',
			svg: 'Vetor: formas e textos continuam editáveis em Figma, Inkscape, Illustrator.', psd: 'Photoshop com camadas (nomes, opacidade, mesclagem).'
		},
		empty: {
			title: 'Editor de imagens', text: 'Crie, abra ou cole uma imagem. Camadas, seleções, varinha mágica (inclusive com IA), filtros, texto 3D e exportação para PSD, SVG, PNG, JPG, WebP e mais.',
			formats: 'Abre PNG, JPG, WebP, AVIF, GIF, BMP, ICO, SVG e PSD. Arraste e solte ou Ctrl+V.', drop: 'Solte para abrir', dropLayer: 'Solte para adicionar como camada'
		},
		quick: { label: 'Ações da seleção', copy: 'Copiar', cut: 'Recortar', move: 'Mover', crop: 'Recortar imagem', fill: 'Preencher', delete: 'Apagar', invert: 'Inverter' },
		status: { selection: 'Seleção', layers: '{count} camadas', zoom: 'Zoom', hint: 'Espaço: mover vista · Ctrl+roda: zoom' },
		mobile: { menu: 'Menu' },
		job: { wand: 'Selecionando…' },
		toast: {
			locked: 'A camada está bloqueada.', vectorLayer: 'Camada de texto/forma: rasterize para pintar nela.', cloneSource: 'Origem do carimbo definida.',
			cloneNeedSource: 'Defina a origem primeiro (Alt+clique ou botão “Definir origem”).', nothingToCopy: 'Nada para copiar.',
			copied: 'Copiado ({w}×{h}). Cole em qualquer app.', copiedInternal: 'Copiado no editor (o navegador bloqueou o clipboard do sistema).',
			clipboardEmpty: 'Nenhuma imagem no clipboard.', pasteLarger: 'A imagem colada é maior que a tela.', pasted: 'Colado: arraste para posicionar e Enter para concluir.',
			noSelection: 'Nada selecionado.', exported: 'Salvo: {name} ({size})', exportFailed: 'Falha ao exportar: {message}', openFailed: 'Não foi possível abrir: {message}'
		},
		hist: {
			open: 'Abrir', select: 'Seleção', wand: 'Varinha mágica', aiSelect: 'Seleção com IA', removeBg: 'Remover fundo', transform: 'Transformar', movePixels: 'Mover pixels',
			moveSelection: 'Mover seleção', addText: 'Novo texto', addShape: 'Nova forma', deselect: 'Desmarcar', invert: 'Inverter seleção', editText: 'Editar texto',
			visibility: 'Visibilidade', lock: 'Bloqueio', rename: 'Renomear camada', opacity: 'Opacidade', blend: 'Mesclagem', fill: 'Preenchimento', effects: 'Efeitos',
			font: 'Fonte', shape: 'Forma', stroke: 'Contorno', newLayer: 'Nova camada', deleteLayer: 'Apagar camada', duplicateLayer: 'Duplicar camada', moveLayer: 'Mover camada',
			mergeDown: 'Mesclar para baixo', flatten: 'Achatar', resize: 'Redimensionar', canvasSize: 'Tamanho da tela', crop: 'Recortar', transformImage: 'Girar/espelhar imagem',
			transformLayer: 'Girar/espelhar camada', autoCrop: 'Cortar bordas vazias'
		}
	},
	en: {
		title: 'Image editor', untitled: 'Untitled', unsaved: 'unexported changes', canvasLabel: 'Drawing canvas',
		confirmDiscard: 'There are unexported changes. Discard and continue?', textPlaceholder: 'Type your text…',
		menu: { file: 'File', edit: 'Edit', select: 'Select', image: 'Image', layers: 'Layers', adjust: 'Adjustments', effects: 'Effects', ai: 'AI', view: 'View' },
		cmd: {
			new: 'New image…', open: 'Open…', openLayer: 'Open as layer…', export: 'Export', undo: 'Undo', redo: 'Redo',
			cut: 'Cut', copy: 'Copy', copyMerged: 'Copy merged', paste: 'Paste', pasteNewLayer: 'Paste into new layer', pasteNewImage: 'Paste into new image',
			delete: 'Erase selection', fillSelection: 'Fill selection', shortcuts: 'Keyboard shortcuts', selectAll: 'Select all', deselect: 'Deselect',
			invert: 'Invert selection', invertSelection: 'Invert selection', selectAlpha: 'Select layer content', selectByColor: 'Select by color',
			feather: 'Feather…', grow: 'Expand…', shrink: 'Contract…', harden: 'Harden edge', selectSubject: 'Select subject (AI)',
			aiSelect: 'Smart select (AI)', removeBg: 'Remove background (AI)', clearAiCache: 'Delete downloaded AI models',
			cropToSelection: 'Crop to selection', autoCrop: 'Trim empty borders', resize: 'Resize image…', canvasSize: 'Canvas size…',
			rotCw: 'Rotate 90° clockwise', rotCcw: 'Rotate 90° counter-clockwise', rot180: 'Rotate 180°', flipH: 'Flip horizontal', flipV: 'Flip vertical',
			flatten: 'Flatten', addLayer: 'New layer', duplicateLayer: 'Duplicate layer', deleteLayer: 'Delete layer', mergeDown: 'Merge down',
			layerFromSelection: 'Layer via copy', layerViaCut: 'Layer via cut', layerFlipH: 'Flip layer horizontal', layerFlipV: 'Flip layer vertical',
			layerRot180: 'Rotate layer 180°', layerUp: 'Move layer up', layerDown: 'Move layer down', rasterize: 'Rasterize layer', bakeEffects: 'Apply effects (rasterize)',
			zoomIn: 'Zoom in', zoomOut: 'Zoom out', fit: 'Fit to window', actualSize: 'Actual size (100%)', pixelGrid: 'Pixel grid',
			repeatFilter: 'Repeat', expandCanvas: 'Expand canvas'
		},
		tools: {
			move: 'Move', 'select-rect': 'Rectangle select', 'select-ellipse': 'Ellipse select', 'select-lasso': 'Lasso', wand: 'Magic wand', crop: 'Crop',
			brush: 'Brush', eraser: 'Eraser', fill: 'Paint bucket', gradient: 'Gradient', picker: 'Color picker', text: 'Text', shape: 'Shapes',
			clone: 'Clone stamp', hand: 'Pan', zoom: 'Zoom'
		},
		toolHints: {
			move: 'Drag to move; handles resize and rotate (Shift keeps ratio). Arrow keys nudge 1 px.',
			text: 'Click the image to type; drag the box to move it.',
			hand: 'Drag to pan. Pinch or Ctrl + wheel to zoom.',
			zoom: 'Click to zoom in; Alt + click or right-click to zoom out.'
		},
		selMode: { replace: 'Replace', add: 'Add (Shift)', subtract: 'Subtract (Alt)', intersect: 'Intersect (Shift+Alt)' },
		wandEngine: { classic: 'Classic', sam: 'AI: click object', subject: 'AI: subject' },
		wandAlgo: { flood: 'Contiguous (4 neighbors)', flood8: 'Contiguous (8 neighbors)', global: 'Global (color everywhere)', edge: 'Stop at edges (Sobel)', cluster: 'k-means clustering (ML)' },
		wandMetric: { rgb: 'RGB', rgba: 'RGB + alpha', lab: 'Perceptual (ΔE Lab)', hue: 'Hue only', luma: 'Brightness only', max: 'Max channel difference' },
		opt: {
			selectMode: 'Selection mode', feather: 'Feather', antialias: 'Antialiasing', engine: 'Engine', algorithm: 'Algorithm', metric: 'Compare',
			tolerance: 'Tolerance', clusters: 'Clusters', contiguous: 'Contiguous', edge: 'Edge strength', sample: 'Sample', sampleLayer: 'Layer', sampleImage: 'Image',
			aiLocal: 'Local AI', model: 'Model', size: 'Size', hardness: 'Hardness', opacity: 'Opacity', flow: 'Flow', smoothing: 'Smoothing', pressure: 'Pen pressure',
			setSource: 'Set source (Alt+click)', type: 'Type', toTransparent: 'To transparent', reverse: 'Reverse colors', sampleSize: 'Area',
			shape: 'Shape', style: 'Style', strokeWidth: 'Width', radius: 'Radius', sides: 'Sides', inner: 'Inner radius', dash: 'Dashed',
			font: 'Font', fontSize: 'Size', weight: 'Weight', italic: 'Italic', align: 'Alignment', aspect: 'Ratio', applyCrop: 'Crop',
			moveMode: 'Move', commit: 'Done'
		},
		gradient: { linear: 'Linear', radial: 'Radial', conic: 'Conic', reflected: 'Reflected' },
		shapeMode: { fill: 'Filled', stroke: 'Outline', both: 'Both' },
		shapes: { rect: 'Rectangle', roundrect: 'Rounded rectangle', ellipse: 'Ellipse', line: 'Line', arrow: 'Arrow', triangle: 'Triangle', polygon: 'Polygon', star: 'Star', heart: 'Heart', speech: 'Speech bubble' },
		align: { left: 'Left', center: 'Center', right: 'Right' },
		aspect: { free: 'Free', original: 'Original' },
		moveMode: { pixels: 'Pixels', selection: 'Selection only' },
		paint: { none: 'None', solid: 'Solid', linear: 'Linear', radial: 'Radial' },
		panels: { tools: 'Tools', options: 'Tool options', layers: 'Layers', colors: 'Colors', history: 'History', properties: 'Properties', label: 'Panels' },
		layer: { blend: 'Blend', hide: 'Hide layer', show: 'Show layer', lock: 'Lock layer', unlock: 'Unlock layer', text: 'Text', pasted: 'Pasted', fromSelection: 'From selection', background: 'Background', layer: 'Layer', copySuffix: 'copy' },
		blends: {
			'source-over': 'Normal', multiply: 'Multiply', screen: 'Screen', overlay: 'Overlay', darken: 'Darken', lighten: 'Lighten', 'color-dodge': 'Color dodge',
			'color-burn': 'Color burn', 'hard-light': 'Hard light', 'soft-light': 'Soft light', difference: 'Difference', exclusion: 'Exclusion', hue: 'Hue',
			saturation: 'Saturation', color: 'Color', luminosity: 'Luminosity'
		},
		color: {
			primary: 'Primary', secondary: 'Secondary', swap: 'Swap colors', reset: 'Black and white', editing: 'Color being edited', eyedropper: 'Pick color from screen',
			satValue: 'Saturation and brightness', hue: 'Hue', alpha: 'Transparency', palette: 'Palette', addSwatch: 'Add color to palette', resetPalette: 'Reset palette',
			recent: 'Recent', swatchHint: 'click: edited color · right-click: the other one · Shift+right: remove'
		},
		props: {
			text: 'Text', shape: 'Shape', fill: 'Fill', stroke: 'Outline', color: 'Color', from: 'From', to: 'To', angle: 'Angle', enabled: 'On',
			lineHeight: 'Line height', letterSpacing: 'Letter spacing', rotation: 'Rotation', quickStyles: 'Quick styles', effects: 'Layer effects'
		},
		presets: { none: 'No effects', classic3d: 'Classic 3D', neon: 'Neon', outline: 'Outline', longShadow: 'Long shadow', retro: 'Retro', soft: 'Soft shadow' },
		fx: { extrude: '3D extrude', shadow: 'Shadow', glow: 'Outer glow', outline: 'Outline', depth: 'Depth', shade: 'Shading', blur: 'Blur', strength: 'Strength' },
		dlg: {
			width: 'Width', height: 'Height', background: 'Background', bg: { white: 'White', transparent: 'Transparent', primary: 'Primary color', secondary: 'Secondary color' },
			fromImage: 'Already have the image? Paste with Ctrl+V or drop it here.', fromImageDrop: 'Drop to open the image', pasteClip: 'Paste from clipboard', openFile: 'Open file', memory: '~{mb} MB per layer', create: 'Create', byPixels: 'By pixels', byPercent: 'By percentage', percent: 'Percentage', keepAspect: 'Keep aspect ratio',
			resample: 'Resampling', quality: { label: 'Quality', high: 'High (best)', medium: 'Medium', low: 'Low (fast)', pixel: 'Nearest neighbor (pixel art)' },
			anchor: 'Anchor', apply: 'Apply', format: 'Format', unsupported: 'This browser cannot encode this format.', layers: 'layers', vector: 'vector',
			lossy: 'lossy', lossless: 'lossless', icoSizes: 'Icon sizes', scale: 'Scale', svgEmbed: 'Include raster layers (images)', save: 'Save',
			amount: 'Amount', cores: 'cores', heavyFilter: 'Heavy filter on {mp} MP: it may take a few seconds. You can stop it any time.',
			noParams: 'No settings: just apply.', previewing: 'Rendering preview…', previewScaled: 'Preview at {pct}% resolution; applying uses full resolution.',
			reset: 'Defaults', compare: 'Original', compareHint: 'Hold to see the original'
		},
		newPresets: { hd: 'Full HD', square: 'Square', story: 'Story', post45: 'Post 4:5', og: 'Link (OG)', a4: 'A4 300 dpi', icon: 'Icon', banner: 'Banner' },
		formatHints: {
			png: 'Lossless with transparency. Great for web, screenshots and artwork.', jpeg: 'Photos with small files. No transparency.',
			webp: 'Modern: smaller than PNG/JPEG, with transparency.', avif: 'Most compact, with transparency. Encoding depends on the browser.',
			bmp: 'Uncompressed bitmap (compatibility).', ico: 'Windows icon/favicon with multiple sizes.',
			svg: 'Vector: shapes and text stay editable in Figma, Inkscape, Illustrator.', psd: 'Photoshop with layers (names, opacity, blending).'
		},
		empty: {
			title: 'Image editor', text: 'Create, open or paste an image. Layers, selections, magic wand (including AI), filters, 3D text and export to PSD, SVG, PNG, JPG, WebP and more.',
			formats: 'Opens PNG, JPG, WebP, AVIF, GIF, BMP, ICO, SVG and PSD. Drag and drop or Ctrl+V.', drop: 'Drop to open', dropLayer: 'Drop to add as a layer'
		},
		quick: { label: 'Selection actions', copy: 'Copy', cut: 'Cut', move: 'Move', crop: 'Crop image', fill: 'Fill', delete: 'Erase', invert: 'Invert' },
		status: { selection: 'Selection', layers: '{count} layers', zoom: 'Zoom', hint: 'Space: pan · Ctrl+wheel: zoom' },
		mobile: { menu: 'Menu' },
		job: { wand: 'Selecting…' },
		toast: {
			locked: 'The layer is locked.', vectorLayer: 'Text/shape layer: rasterize it to paint on it.', cloneSource: 'Clone source set.',
			cloneNeedSource: 'Set the source first (Alt+click or the “Set source” button).', nothingToCopy: 'Nothing to copy.',
			copied: 'Copied ({w}×{h}). Paste it in any app.', copiedInternal: 'Copied inside the editor (the browser blocked the system clipboard).',
			clipboardEmpty: 'No image in the clipboard.', pasteLarger: 'The pasted image is larger than the canvas.', pasted: 'Pasted: drag to place it, Enter to finish.',
			noSelection: 'Nothing selected.', exported: 'Saved: {name} ({size})', exportFailed: 'Export failed: {message}', openFailed: 'Could not open: {message}'
		},
		hist: {
			open: 'Open', select: 'Selection', wand: 'Magic wand', aiSelect: 'AI selection', removeBg: 'Remove background', transform: 'Transform', movePixels: 'Move pixels',
			moveSelection: 'Move selection', addText: 'New text', addShape: 'New shape', deselect: 'Deselect', invert: 'Invert selection', editText: 'Edit text',
			visibility: 'Visibility', lock: 'Lock', rename: 'Rename layer', opacity: 'Opacity', blend: 'Blend mode', fill: 'Fill', effects: 'Effects',
			font: 'Font', shape: 'Shape', stroke: 'Outline', newLayer: 'New layer', deleteLayer: 'Delete layer', duplicateLayer: 'Duplicate layer', moveLayer: 'Move layer',
			mergeDown: 'Merge down', flatten: 'Flatten', resize: 'Resize', canvasSize: 'Canvas size', crop: 'Crop', transformImage: 'Rotate/flip image',
			transformLayer: 'Rotate/flip layer', autoCrop: 'Trim empty borders'
		}
	},
	es: {
		title: 'Editor de imágenes', untitled: 'Sin título', unsaved: 'cambios sin exportar', canvasLabel: 'Lienzo de dibujo',
		confirmDiscard: 'Hay cambios sin exportar. ¿Descartar y continuar?', textPlaceholder: 'Escribe el texto…',
		menu: { file: 'Archivo', edit: 'Editar', select: 'Selección', image: 'Imagen', layers: 'Capas', adjust: 'Ajustes', effects: 'Efectos', ai: 'IA', view: 'Ver' },
		cmd: {
			new: 'Nueva imagen…', open: 'Abrir…', openLayer: 'Abrir como capa…', export: 'Exportar', undo: 'Deshacer', redo: 'Rehacer',
			cut: 'Cortar', copy: 'Copiar', copyMerged: 'Copiar combinado', paste: 'Pegar', pasteNewLayer: 'Pegar en nueva capa', pasteNewImage: 'Pegar en nueva imagen',
			delete: 'Borrar selección', fillSelection: 'Rellenar selección', shortcuts: 'Atajos de teclado', selectAll: 'Seleccionar todo', deselect: 'Deseleccionar',
			invert: 'Invertir selección', invertSelection: 'Invertir selección', selectAlpha: 'Seleccionar contenido de la capa', selectByColor: 'Seleccionar por color',
			feather: 'Suavizar borde…', grow: 'Expandir…', shrink: 'Contraer…', harden: 'Endurecer borde', selectSubject: 'Seleccionar sujeto (IA)',
			aiSelect: 'Selección inteligente (IA)', removeBg: 'Quitar fondo (IA)', clearAiCache: 'Borrar modelos de IA descargados',
			cropToSelection: 'Recortar a la selección', autoCrop: 'Recortar bordes vacíos', resize: 'Redimensionar imagen…', canvasSize: 'Tamaño del lienzo…',
			rotCw: 'Girar 90° horario', rotCcw: 'Girar 90° antihorario', rot180: 'Girar 180°', flipH: 'Voltear horizontal', flipV: 'Voltear vertical',
			flatten: 'Acoplar', addLayer: 'Nueva capa', duplicateLayer: 'Duplicar capa', deleteLayer: 'Borrar capa', mergeDown: 'Combinar hacia abajo',
			layerFromSelection: 'Capa vía copiar', layerViaCut: 'Capa vía cortar', layerFlipH: 'Voltear capa (horizontal)', layerFlipV: 'Voltear capa (vertical)',
			layerRot180: 'Girar capa 180°', layerUp: 'Subir capa', layerDown: 'Bajar capa', rasterize: 'Rasterizar capa', bakeEffects: 'Aplicar efectos (rasterizar)',
			zoomIn: 'Acercar', zoomOut: 'Alejar', fit: 'Ajustar a la ventana', actualSize: 'Tamaño real (100%)', pixelGrid: 'Cuadrícula de píxeles',
			repeatFilter: 'Repetir', expandCanvas: 'Expandir lienzo'
		},
		tools: {
			move: 'Mover', 'select-rect': 'Selección rectangular', 'select-ellipse': 'Selección elíptica', 'select-lasso': 'Lazo', wand: 'Varita mágica', crop: 'Recortar',
			brush: 'Pincel', eraser: 'Borrador', fill: 'Bote de pintura', gradient: 'Degradado', picker: 'Cuentagotas', text: 'Texto', shape: 'Formas',
			clone: 'Tampón de clonar', hand: 'Mano (mover vista)', zoom: 'Zoom'
		},
		toolHints: {
			move: 'Arrastra para mover; las asas redimensionan y giran (Shift mantiene la proporción). Las flechas mueven 1 px.',
			text: 'Haz clic en la imagen para escribir; arrastra la caja para moverla.',
			hand: 'Arrastra para mover la vista. Pellizca o Ctrl + rueda para hacer zoom.',
			zoom: 'Clic para acercar; Alt + clic o botón derecho para alejar.'
		},
		selMode: { replace: 'Reemplazar', add: 'Sumar (Shift)', subtract: 'Restar (Alt)', intersect: 'Intersección (Shift+Alt)' },
		wandEngine: { classic: 'Clásica', sam: 'IA: clic en el objeto', subject: 'IA: sujeto' },
		wandAlgo: { flood: 'Contigua (4 vecinos)', flood8: 'Contigua (8 vecinos)', global: 'Global (color en toda la imagen)', edge: 'Se detiene en bordes (Sobel)', cluster: 'Agrupamiento k-means (ML)' },
		wandMetric: { rgb: 'RGB', rgba: 'RGB + alfa', lab: 'Perceptual (ΔE Lab)', hue: 'Solo tono', luma: 'Solo brillo', max: 'Mayor diferencia por canal' },
		opt: {
			selectMode: 'Modo de selección', feather: 'Suavizar', antialias: 'Suavizado', engine: 'Motor', algorithm: 'Algoritmo', metric: 'Comparar',
			tolerance: 'Tolerancia', clusters: 'Grupos', contiguous: 'Contigua', edge: 'Fuerza del borde', sample: 'Muestra', sampleLayer: 'Capa', sampleImage: 'Imagen',
			aiLocal: 'IA local', model: 'Modelo', size: 'Tamaño', hardness: 'Dureza', opacity: 'Opacidad', flow: 'Flujo', smoothing: 'Suavizado del trazo', pressure: 'Presión del lápiz',
			setSource: 'Definir origen (Alt+clic)', type: 'Tipo', toTransparent: 'Hacia transparente', reverse: 'Invertir colores', sampleSize: 'Área',
			shape: 'Forma', style: 'Estilo', strokeWidth: 'Grosor', radius: 'Radio', sides: 'Lados', inner: 'Radio interior', dash: 'Discontinuo',
			font: 'Fuente', fontSize: 'Tamaño', weight: 'Peso', italic: 'Cursiva', align: 'Alineación', aspect: 'Proporción', applyCrop: 'Recortar',
			moveMode: 'Mover', commit: 'Listo'
		},
		gradient: { linear: 'Lineal', radial: 'Radial', conic: 'Cónico', reflected: 'Reflejado' },
		shapeMode: { fill: 'Relleno', stroke: 'Contorno', both: 'Ambos' },
		shapes: { rect: 'Rectángulo', roundrect: 'Rectángulo redondeado', ellipse: 'Elipse', line: 'Línea', arrow: 'Flecha', triangle: 'Triángulo', polygon: 'Polígono', star: 'Estrella', heart: 'Corazón', speech: 'Globo de diálogo' },
		align: { left: 'Izquierda', center: 'Centro', right: 'Derecha' },
		aspect: { free: 'Libre', original: 'Original' },
		moveMode: { pixels: 'Píxeles', selection: 'Solo la selección' },
		paint: { none: 'Ninguno', solid: 'Sólido', linear: 'Lineal', radial: 'Radial' },
		panels: { tools: 'Herramientas', options: 'Opciones de la herramienta', layers: 'Capas', colors: 'Colores', history: 'Historial', properties: 'Propiedades', label: 'Paneles' },
		layer: { blend: 'Fusión', hide: 'Ocultar capa', show: 'Mostrar capa', lock: 'Bloquear capa', unlock: 'Desbloquear capa', text: 'Texto', pasted: 'Pegado', fromSelection: 'De la selección', background: 'Fondo', layer: 'Capa', copySuffix: 'copia' },
		blends: {
			'source-over': 'Normal', multiply: 'Multiplicar', screen: 'Trama', overlay: 'Superponer', darken: 'Oscurecer', lighten: 'Aclarar', 'color-dodge': 'Sobreexponer color',
			'color-burn': 'Subexponer color', 'hard-light': 'Luz fuerte', 'soft-light': 'Luz suave', difference: 'Diferencia', exclusion: 'Exclusión', hue: 'Tono',
			saturation: 'Saturación', color: 'Color', luminosity: 'Luminosidad'
		},
		color: {
			primary: 'Primario', secondary: 'Secundario', swap: 'Intercambiar colores', reset: 'Blanco y negro', editing: 'Color en edición', eyedropper: 'Tomar color de la pantalla',
			satValue: 'Saturación y brillo', hue: 'Tono', alpha: 'Transparencia', palette: 'Paleta', addSwatch: 'Añadir color a la paleta', resetPalette: 'Restaurar paleta',
			recent: 'Recientes', swatchHint: 'clic: color en edición · clic derecho: el otro · Shift+derecho: quitar'
		},
		props: {
			text: 'Texto', shape: 'Forma', fill: 'Relleno', stroke: 'Contorno', color: 'Color', from: 'De', to: 'A', angle: 'Ángulo', enabled: 'Activo',
			lineHeight: 'Interlineado', letterSpacing: 'Espaciado', rotation: 'Rotación', quickStyles: 'Estilos rápidos', effects: 'Efectos de capa'
		},
		presets: { none: 'Sin efectos', classic3d: '3D clásico', neon: 'Neón', outline: 'Contorno', longShadow: 'Sombra larga', retro: 'Retro', soft: 'Sombra suave' },
		fx: { extrude: 'Extrusión 3D', shadow: 'Sombra', glow: 'Resplandor exterior', outline: 'Contorno', depth: 'Profundidad', shade: 'Sombreado', blur: 'Desenfoque', strength: 'Intensidad' },
		dlg: {
			width: 'Ancho', height: 'Alto', background: 'Fondo', bg: { white: 'Blanco', transparent: 'Transparente', primary: 'Color primario', secondary: 'Color secundario' },
			fromImage: '¿Ya tienes la imagen? Pégala con Ctrl+V o arrástrala aquí.', fromImageDrop: 'Suelta para abrir la imagen', pasteClip: 'Pegar del portapapeles', openFile: 'Abrir archivo', memory: '~{mb} MB por capa', create: 'Crear', byPixels: 'Por píxeles', byPercent: 'Por porcentaje', percent: 'Porcentaje', keepAspect: 'Mantener proporción',
			resample: 'Remuestreo', quality: { label: 'Calidad', high: 'Alta (mejor)', medium: 'Media', low: 'Baja (rápida)', pixel: 'Vecino más cercano (pixel art)' },
			anchor: 'Ancla', apply: 'Aplicar', format: 'Formato', unsupported: 'Este navegador no puede generar este formato.', layers: 'capas', vector: 'vector',
			lossy: 'con pérdida', lossless: 'sin pérdida', icoSizes: 'Tamaños del icono', scale: 'Escala', svgEmbed: 'Incluir capas ráster (imágenes)', save: 'Guardar',
			amount: 'Cantidad', cores: 'núcleos', heavyFilter: 'Filtro pesado en {mp} MP: puede tardar unos segundos. Puedes detenerlo cuando quieras.',
			noParams: 'Sin ajustes: solo aplica.', previewing: 'Generando vista previa…', previewScaled: 'Vista previa al {pct}% de resolución; al aplicar se usa la resolución completa.',
			reset: 'Valores por defecto', compare: 'Original', compareHint: 'Mantén pulsado para ver el original'
		},
		newPresets: { hd: 'Full HD', square: 'Cuadrado', story: 'Historia', post45: 'Post 4:5', og: 'Enlace (OG)', a4: 'A4 300 ppp', icon: 'Icono', banner: 'Banner' },
		formatHints: {
			png: 'Sin pérdida y con transparencia. Ideal para web, capturas y arte.', jpeg: 'Fotos con archivos pequeños. Sin transparencia.',
			webp: 'Moderno: más pequeño que PNG/JPEG, con transparencia.', avif: 'El más compacto, con transparencia. La codificación depende del navegador.',
			bmp: 'Mapa de bits sin compresión (compatibilidad).', ico: 'Icono de Windows/favicon con varios tamaños.',
			svg: 'Vector: formas y textos siguen editables en Figma, Inkscape, Illustrator.', psd: 'Photoshop con capas (nombres, opacidad, fusión).'
		},
		empty: {
			title: 'Editor de imágenes', text: 'Crea, abre o pega una imagen. Capas, selecciones, varita mágica (también con IA), filtros, texto 3D y exportación a PSD, SVG, PNG, JPG, WebP y más.',
			formats: 'Abre PNG, JPG, WebP, AVIF, GIF, BMP, ICO, SVG y PSD. Arrastra y suelta o Ctrl+V.', drop: 'Suelta para abrir', dropLayer: 'Suelta para añadir como capa'
		},
		quick: { label: 'Acciones de la selección', copy: 'Copiar', cut: 'Cortar', move: 'Mover', crop: 'Recortar imagen', fill: 'Rellenar', delete: 'Borrar', invert: 'Invertir' },
		status: { selection: 'Selección', layers: '{count} capas', zoom: 'Zoom', hint: 'Espacio: mover vista · Ctrl+rueda: zoom' },
		mobile: { menu: 'Menú' },
		job: { wand: 'Seleccionando…' },
		toast: {
			locked: 'La capa está bloqueada.', vectorLayer: 'Capa de texto/forma: rasterízala para pintar en ella.', cloneSource: 'Origen del tampón definido.',
			cloneNeedSource: 'Define primero el origen (Alt+clic o el botón “Definir origen”).', nothingToCopy: 'Nada que copiar.',
			copied: 'Copiado ({w}×{h}). Pégalo en cualquier app.', copiedInternal: 'Copiado en el editor (el navegador bloqueó el portapapeles del sistema).',
			clipboardEmpty: 'No hay imagen en el portapapeles.', pasteLarger: 'La imagen pegada es mayor que el lienzo.', pasted: 'Pegado: arrastra para colocarlo y Enter para terminar.',
			noSelection: 'Nada seleccionado.', exported: 'Guardado: {name} ({size})', exportFailed: 'Error al exportar: {message}', openFailed: 'No se pudo abrir: {message}'
		},
		hist: {
			open: 'Abrir', select: 'Selección', wand: 'Varita mágica', aiSelect: 'Selección con IA', removeBg: 'Quitar fondo', transform: 'Transformar', movePixels: 'Mover píxeles',
			moveSelection: 'Mover selección', addText: 'Nuevo texto', addShape: 'Nueva forma', deselect: 'Deseleccionar', invert: 'Invertir selección', editText: 'Editar texto',
			visibility: 'Visibilidad', lock: 'Bloqueo', rename: 'Renombrar capa', opacity: 'Opacidad', blend: 'Fusión', fill: 'Relleno', effects: 'Efectos',
			font: 'Fuente', shape: 'Forma', stroke: 'Contorno', newLayer: 'Nueva capa', deleteLayer: 'Borrar capa', duplicateLayer: 'Duplicar capa', moveLayer: 'Mover capa',
			mergeDown: 'Combinar hacia abajo', flatten: 'Acoplar', resize: 'Redimensionar', canvasSize: 'Tamaño del lienzo', crop: 'Recortar', transformImage: 'Girar/voltear imagen',
			transformLayer: 'Girar/voltear capa', autoCrop: 'Recortar bordes vacíos'
		}
	},
	fr: {
		title: 'Éditeur d’images', untitled: 'Sans titre', unsaved: 'modifications non exportées', canvasLabel: 'Zone de dessin',
		confirmDiscard: 'Des modifications ne sont pas exportées. Les abandonner et continuer ?', textPlaceholder: 'Saisissez le texte…',
		menu: { file: 'Fichier', edit: 'Édition', select: 'Sélection', image: 'Image', layers: 'Calques', adjust: 'Réglages', effects: 'Effets', ai: 'IA', view: 'Affichage' },
		cmd: {
			new: 'Nouvelle image…', open: 'Ouvrir…', openLayer: 'Ouvrir comme calque…', export: 'Exporter', undo: 'Annuler', redo: 'Rétablir',
			cut: 'Couper', copy: 'Copier', copyMerged: 'Copier avec fusion', paste: 'Coller', pasteNewLayer: 'Coller dans un nouveau calque', pasteNewImage: 'Coller dans une nouvelle image',
			delete: 'Effacer la sélection', fillSelection: 'Remplir la sélection', shortcuts: 'Raccourcis clavier', selectAll: 'Tout sélectionner', deselect: 'Désélectionner',
			invert: 'Inverser la sélection', invertSelection: 'Inverser la sélection', selectAlpha: 'Sélectionner le contenu du calque', selectByColor: 'Sélectionner par couleur',
			feather: 'Adoucir le bord…', grow: 'Étendre…', shrink: 'Contracter…', harden: 'Durcir le bord', selectSubject: 'Sélectionner le sujet (IA)',
			aiSelect: 'Sélection intelligente (IA)', removeBg: 'Supprimer l’arrière-plan (IA)', clearAiCache: 'Supprimer les modèles d’IA téléchargés',
			cropToSelection: 'Recadrer sur la sélection', autoCrop: 'Rogner les bords vides', resize: 'Redimensionner l’image…', canvasSize: 'Taille du canevas…',
			rotCw: 'Pivoter de 90° (horaire)', rotCcw: 'Pivoter de 90° (antihoraire)', rot180: 'Pivoter de 180°', flipH: 'Retourner horizontalement', flipV: 'Retourner verticalement',
			flatten: 'Aplatir', addLayer: 'Nouveau calque', duplicateLayer: 'Dupliquer le calque', deleteLayer: 'Supprimer le calque', mergeDown: 'Fusionner vers le bas',
			layerFromSelection: 'Calque par copie', layerViaCut: 'Calque par coupure', layerFlipH: 'Retourner le calque (horizontal)', layerFlipV: 'Retourner le calque (vertical)',
			layerRot180: 'Pivoter le calque de 180°', layerUp: 'Monter le calque', layerDown: 'Descendre le calque', rasterize: 'Pixelliser le calque', bakeEffects: 'Appliquer les effets (pixelliser)',
			zoomIn: 'Zoom avant', zoomOut: 'Zoom arrière', fit: 'Ajuster à la fenêtre', actualSize: 'Taille réelle (100 %)', pixelGrid: 'Grille de pixels',
			repeatFilter: 'Répéter', expandCanvas: 'Agrandir le canevas'
		},
		tools: {
			move: 'Déplacer', 'select-rect': 'Sélection rectangulaire', 'select-ellipse': 'Sélection elliptique', 'select-lasso': 'Lasso', wand: 'Baguette magique', crop: 'Recadrer',
			brush: 'Pinceau', eraser: 'Gomme', fill: 'Pot de peinture', gradient: 'Dégradé', picker: 'Pipette', text: 'Texte', shape: 'Formes',
			clone: 'Tampon de duplication', hand: 'Main (déplacer la vue)', zoom: 'Zoom'
		},
		toolHints: {
			move: 'Faites glisser pour déplacer ; les poignées redimensionnent et pivotent (Maj garde les proportions). Les flèches déplacent de 1 px.',
			text: 'Cliquez sur l’image pour écrire ; faites glisser la boîte pour la déplacer.',
			hand: 'Faites glisser pour déplacer la vue. Pincez ou Ctrl + molette pour zoomer.',
			zoom: 'Cliquez pour zoomer ; Alt + clic ou clic droit pour dézoomer.'
		},
		selMode: { replace: 'Remplacer', add: 'Ajouter (Maj)', subtract: 'Soustraire (Alt)', intersect: 'Intersection (Maj+Alt)' },
		wandEngine: { classic: 'Classique', sam: 'IA : clic sur l’objet', subject: 'IA : sujet' },
		wandAlgo: { flood: 'Contiguë (4 voisins)', flood8: 'Contiguë (8 voisins)', global: 'Globale (couleur partout)', edge: 'S’arrête aux bords (Sobel)', cluster: 'Regroupement k-means (ML)' },
		wandMetric: { rgb: 'RVB', rgba: 'RVB + alpha', lab: 'Perceptuelle (ΔE Lab)', hue: 'Teinte seule', luma: 'Luminosité seule', max: 'Écart max par canal' },
		opt: {
			selectMode: 'Mode de sélection', feather: 'Adoucir', antialias: 'Anticrénelage', engine: 'Moteur', algorithm: 'Algorithme', metric: 'Comparer',
			tolerance: 'Tolérance', clusters: 'Groupes', contiguous: 'Contiguë', edge: 'Force des bords', sample: 'Échantillon', sampleLayer: 'Calque', sampleImage: 'Image',
			aiLocal: 'IA locale', model: 'Modèle', size: 'Taille', hardness: 'Dureté', opacity: 'Opacité', flow: 'Flux', smoothing: 'Lissage', pressure: 'Pression du stylet',
			setSource: 'Définir la source (Alt+clic)', type: 'Type', toTransparent: 'Vers transparent', reverse: 'Inverser les couleurs', sampleSize: 'Zone',
			shape: 'Forme', style: 'Style', strokeWidth: 'Épaisseur', radius: 'Rayon', sides: 'Côtés', inner: 'Rayon intérieur', dash: 'Pointillés',
			font: 'Police', fontSize: 'Taille', weight: 'Graisse', italic: 'Italique', align: 'Alignement', aspect: 'Proportion', applyCrop: 'Recadrer',
			moveMode: 'Déplacer', commit: 'Terminer'
		},
		gradient: { linear: 'Linéaire', radial: 'Radial', conic: 'Conique', reflected: 'Réfléchi' },
		shapeMode: { fill: 'Plein', stroke: 'Contour', both: 'Les deux' },
		shapes: { rect: 'Rectangle', roundrect: 'Rectangle arrondi', ellipse: 'Ellipse', line: 'Ligne', arrow: 'Flèche', triangle: 'Triangle', polygon: 'Polygone', star: 'Étoile', heart: 'Cœur', speech: 'Bulle de dialogue' },
		align: { left: 'Gauche', center: 'Centre', right: 'Droite' },
		aspect: { free: 'Libre', original: 'Originale' },
		moveMode: { pixels: 'Pixels', selection: 'Sélection seule' },
		paint: { none: 'Aucun', solid: 'Uni', linear: 'Linéaire', radial: 'Radial' },
		panels: { tools: 'Outils', options: 'Options de l’outil', layers: 'Calques', colors: 'Couleurs', history: 'Historique', properties: 'Propriétés', label: 'Panneaux' },
		layer: { blend: 'Fusion', hide: 'Masquer le calque', show: 'Afficher le calque', lock: 'Verrouiller le calque', unlock: 'Déverrouiller le calque', text: 'Texte', pasted: 'Collé', fromSelection: 'Depuis la sélection', background: 'Arrière-plan', layer: 'Calque', copySuffix: 'copie' },
		blends: {
			'source-over': 'Normal', multiply: 'Produit', screen: 'Superposition claire', overlay: 'Incrustation', darken: 'Assombrir', lighten: 'Éclaircir', 'color-dodge': 'Densité couleur −',
			'color-burn': 'Densité couleur +', 'hard-light': 'Lumière crue', 'soft-light': 'Lumière tamisée', difference: 'Différence', exclusion: 'Exclusion', hue: 'Teinte',
			saturation: 'Saturation', color: 'Couleur', luminosity: 'Luminosité'
		},
		color: {
			primary: 'Principale', secondary: 'Secondaire', swap: 'Échanger les couleurs', reset: 'Noir et blanc', editing: 'Couleur modifiée', eyedropper: 'Prendre une couleur à l’écran',
			satValue: 'Saturation et luminosité', hue: 'Teinte', alpha: 'Transparence', palette: 'Palette', addSwatch: 'Ajouter la couleur à la palette', resetPalette: 'Réinitialiser la palette',
			recent: 'Récentes', swatchHint: 'clic : couleur modifiée · clic droit : l’autre · Maj+droit : retirer'
		},
		props: {
			text: 'Texte', shape: 'Forme', fill: 'Remplissage', stroke: 'Contour', color: 'Couleur', from: 'De', to: 'À', angle: 'Angle', enabled: 'Actif',
			lineHeight: 'Interligne', letterSpacing: 'Espacement', rotation: 'Rotation', quickStyles: 'Styles rapides', effects: 'Effets de calque'
		},
		presets: { none: 'Sans effets', classic3d: '3D classique', neon: 'Néon', outline: 'Contour', longShadow: 'Ombre longue', retro: 'Rétro', soft: 'Ombre douce' },
		fx: { extrude: 'Extrusion 3D', shadow: 'Ombre portée', glow: 'Lueur externe', outline: 'Contour', depth: 'Profondeur', shade: 'Ombrage', blur: 'Flou', strength: 'Intensité' },
		dlg: {
			width: 'Largeur', height: 'Hauteur', background: 'Fond', bg: { white: 'Blanc', transparent: 'Transparent', primary: 'Couleur principale', secondary: 'Couleur secondaire' },
			fromImage: 'Vous avez déjà l’image ? Collez-la avec Ctrl+V ou déposez-la ici.', fromImageDrop: 'Déposez pour ouvrir l’image', pasteClip: 'Coller depuis le presse-papiers', openFile: 'Ouvrir un fichier', memory: '~{mb} Mo par calque', create: 'Créer', byPixels: 'En pixels', byPercent: 'En pourcentage', percent: 'Pourcentage', keepAspect: 'Conserver les proportions',
			resample: 'Rééchantillonnage', quality: { label: 'Qualité', high: 'Haute (meilleure)', medium: 'Moyenne', low: 'Basse (rapide)', pixel: 'Plus proche voisin (pixel art)' },
			anchor: 'Ancrage', apply: 'Appliquer', format: 'Format', unsupported: 'Ce navigateur ne sait pas encoder ce format.', layers: 'calques', vector: 'vectoriel',
			lossy: 'avec perte', lossless: 'sans perte', icoSizes: 'Tailles de l’icône', scale: 'Échelle', svgEmbed: 'Inclure les calques matriciels (images)', save: 'Enregistrer',
			amount: 'Quantité', cores: 'cœurs', heavyFilter: 'Filtre lourd sur {mp} MP : cela peut prendre quelques secondes. Vous pouvez l’arrêter à tout moment.',
			noParams: 'Aucun réglage : il suffit d’appliquer.', previewing: 'Aperçu en cours…', previewScaled: 'Aperçu à {pct} % de la résolution ; l’application utilise la pleine résolution.',
			reset: 'Valeurs par défaut', compare: 'Original', compareHint: 'Maintenez pour voir l’original'
		},
		newPresets: { hd: 'Full HD', square: 'Carré', story: 'Story', post45: 'Post 4:5', og: 'Lien (OG)', a4: 'A4 300 ppp', icon: 'Icône', banner: 'Bannière' },
		formatHints: {
			png: 'Sans perte, avec transparence. Idéal pour le web, les captures et les illustrations.', jpeg: 'Photos avec des fichiers légers. Sans transparence.',
			webp: 'Moderne : plus léger que PNG/JPEG, avec transparence.', avif: 'Le plus compact, avec transparence. L’encodage dépend du navigateur.',
			bmp: 'Bitmap non compressé (compatibilité).', ico: 'Icône Windows/favicon en plusieurs tailles.',
			svg: 'Vectoriel : formes et textes restent modifiables dans Figma, Inkscape, Illustrator.', psd: 'Photoshop avec calques (noms, opacité, fusion).'
		},
		empty: {
			title: 'Éditeur d’images', text: 'Créez, ouvrez ou collez une image. Calques, sélections, baguette magique (y compris avec IA), filtres, texte 3D et export en PSD, SVG, PNG, JPG, WebP et plus.',
			formats: 'Ouvre PNG, JPG, WebP, AVIF, GIF, BMP, ICO, SVG et PSD. Glissez-déposez ou Ctrl+V.', drop: 'Déposez pour ouvrir', dropLayer: 'Déposez pour ajouter comme calque'
		},
		quick: { label: 'Actions de sélection', copy: 'Copier', cut: 'Couper', move: 'Déplacer', crop: 'Recadrer l’image', fill: 'Remplir', delete: 'Effacer', invert: 'Inverser' },
		status: { selection: 'Sélection', layers: '{count} calques', zoom: 'Zoom', hint: 'Espace : déplacer la vue · Ctrl+molette : zoom' },
		mobile: { menu: 'Menu' },
		job: { wand: 'Sélection…' },
		toast: {
			locked: 'Le calque est verrouillé.', vectorLayer: 'Calque texte/forme : pixellisez-le pour peindre dessus.', cloneSource: 'Source du tampon définie.',
			cloneNeedSource: 'Définissez d’abord la source (Alt+clic ou bouton « Définir la source »).', nothingToCopy: 'Rien à copier.',
			copied: 'Copié ({w}×{h}). Collez-le dans n’importe quelle app.', copiedInternal: 'Copié dans l’éditeur (le navigateur a bloqué le presse-papiers système).',
			clipboardEmpty: 'Aucune image dans le presse-papiers.', pasteLarger: 'L’image collée est plus grande que le canevas.', pasted: 'Collé : faites glisser pour placer, Entrée pour terminer.',
			noSelection: 'Rien n’est sélectionné.', exported: 'Enregistré : {name} ({size})', exportFailed: 'Échec de l’export : {message}', openFailed: 'Impossible d’ouvrir : {message}'
		},
		hist: {
			open: 'Ouverture', select: 'Sélection', wand: 'Baguette magique', aiSelect: 'Sélection IA', removeBg: 'Supprimer l’arrière-plan', transform: 'Transformer', movePixels: 'Déplacer des pixels',
			moveSelection: 'Déplacer la sélection', addText: 'Nouveau texte', addShape: 'Nouvelle forme', deselect: 'Désélectionner', invert: 'Inverser la sélection', editText: 'Modifier le texte',
			visibility: 'Visibilité', lock: 'Verrouillage', rename: 'Renommer le calque', opacity: 'Opacité', blend: 'Mode de fusion', fill: 'Remplissage', effects: 'Effets',
			font: 'Police', shape: 'Forme', stroke: 'Contour', newLayer: 'Nouveau calque', deleteLayer: 'Supprimer le calque', duplicateLayer: 'Dupliquer le calque', moveLayer: 'Déplacer le calque',
			mergeDown: 'Fusionner vers le bas', flatten: 'Aplatir', resize: 'Redimensionner', canvasSize: 'Taille du canevas', crop: 'Recadrer', transformImage: 'Pivoter/retourner l’image',
			transformLayer: 'Pivoter/retourner le calque', autoCrop: 'Rogner les bords vides'
		}
	}
});
