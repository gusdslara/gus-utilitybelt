# Gus Utility Belt

Kit de utilidades para devs em formato desktop (dock flutuante estilo macOS/Pop!_OS Cosmic).
SSG com SvelteKit 3 + Svelte 5 (runes), Vite 8 (Rolldown), TypeScript 7 nativo e Bun. Tudo roda no navegador: nada é enviado para servidores.

Notas do stack:
- Configuração do SvelteKit fica no plugin em `vite.config.ts` (o Kit 3 não usa mais `svelte.config.js`).
- Imports internos usam o alias `#lib/...` (subpath imports no `package.json`), com extensão (`#lib/editor/format.ts`).
- TypeScript: `typescript@6` fica instalado porque o SvelteKit ainda usa a API JS dele; o type check roda no TS 7 nativo (`@typescript/native`, `svelte-check --tsgo`).

## Ferramentas
- **Editor**: pasta padrão no IndexedDB, criar/apagar arquivos e pastas, Ctrl+S, Salvar como (download), abrir pasta do PC (Chrome/Edge, File System Access API).
  - **Rascunhos sem nome**: o editor abre num rascunho vazio (fica salvo no navegador). Cole qualquer coisa, a linguagem é detectada sozinha; Ctrl+S pede nome com a extensão já sugerida.
  - **Formatar** (`Shift+Alt+F` ou `Ctrl+Alt+L`): Prettier para JS/TS/JSX/TSX, JSON/JSONC/JSON5, YAML (`.yml`/`.yaml`), HTML, Vue, Angular, CSS/SCSS/Less, Markdown/MDX, GraphQL, Handlebars, XML/SVG e PHP; `sql-formatter` para SQL (Postgres, MySQL, SQLite, T-SQL, PL/SQL). Demais linguagens recebem limpeza básica (espaços finais, linhas em branco). Ctrl+Z desfaz.
  - **Linguagem** (`Shift+Alt+L` ou clique na barra de status): busca em tempo real por nome ou extensão. Quando a detecção não tem certeza, o seletor abre com as sugestões no topo.
  - **Diff** (`Shift+Alt+D`): compara o arquivo com a versão salva, com outro arquivo/rascunho ou com um texto colado. Lado a lado ou unificado, destaque por palavra, opção de ignorar espaços.
  - `Alt+N`: novo rascunho.
- **Imagem** (editor inspirado no Paint.NET, carregado sob demanda): camadas (opacidade, 16 modos de mesclagem, bloquear, mesclar, achatar), histórico com miniaturas e limite de memória.
  - **Seleção**: retângulo, elipse, laço, somar/subtrair/interseção (Shift/Alt), suavizar, expandir/contrair, inverter, mover só o contorno. Barra de ações rápidas (copiar, recortar, mover, recortar imagem, preencher, apagar).
  - **Varinha mágica**: contígua 4/8 vizinhos, global, para nas bordas (Sobel), agrupamento k-means; cor por RGB, RGB+alfa, ΔE Lab, matiz, brilho ou maior diferença por canal; tolerância e antisserrilhado. Roda num Web Worker.
  - **IA local** (opcional, com aviso de desempenho e botão “Parar agora” que mata o worker): seleção por clique (SlimSAM), selecionar sujeito e remover fundo (MODNet; RMBG-1.4 com licença não comercial). Modelos baixados uma vez do Hugging Face e guardados no navegador; WebGPU com fallback para WebAssembly. Nenhuma imagem sai do dispositivo.
  - **Ferramentas**: mover/transformar (escala, giro, alças), recortar com proporções, pincel (dureza, fluxo, suavização, pressão da caneta), borracha, balde, gradiente (linear, radial, cônico, refletido), conta-gotas, carimbo, texto e formas vetoriais editáveis (10 formas), mão e zoom.
  - **Efeitos de camada**: extrusão 3D, sombra, brilho, contorno e estilos rápidos (3D clássico, neon, retrô…).
  - **Filtros** (39, com prévia ao vivo e Parar): ajustes de cor, desfoques (gaussiano, movimento, radial, zoom, superfície), nitidez, ruído/mediana, estilizar, distorcer e artísticos.
  - **Cores**: primária/secundária, seletor HSV com alfa, HEX/RGB/HSL, conta-gotas da tela (EyeDropper), paleta salva e recentes.
  - **Arquivos**: abre PNG, JPG, WebP, AVIF, GIF, BMP, ICO, SVG e PSD (com camadas, via `ag-psd`); exporta PNG, JPG, WebP, AVIF (se o navegador suportar), BMP, ICO multi-tamanho, SVG vetorial e PSD com camadas. Colar com Ctrl+V, arrastar e soltar, copiar para o clipboard do sistema.
  - **Conversor em lote (modo fácil)**: botão Editor | Conversor no topo do app. Solte, cole ou escolha um arquivo, vários ou uma pasta inteira, escolha o formato e pronto. Pool de Web Workers (até 4 em paralelo), nada vai para servidor.
    - Entrada: JPG, PNG, WebP, AVIF, GIF, BMP, ICO, SVG, HEIC/HEIF (iPhone), TIFF e PSD. Saída: mesmo formato, JPG, PNG, WebP, AVIF, GIF, BMP, ICO, TIFF, PDF (uma página por imagem ou tudo junto), SVG vetorizado e PSD.
    - Qualidade, tamanho máximo em KB (busca a melhor qualidade que cabe), redimensionar (%, caber em, exato), cor de fundo para formatos sem transparência. Respeita a orientação EXIF e remove metadados (GPS).
    - Baixar um a um, em ZIP ou direto numa pasta (Chrome/Edge); abrir qualquer resultado no editor.
    - AVIF/WebP usam o codificador do navegador e caem para WASM (`@jsquash`) quando ele não existe (Chrome não gera AVIF; Safari não gera WebP). HEIC via `heic-to` (LGPL, carregado só quando aparece um HEIC).
  - **Celular**: barra de ferramentas inferior, painéis em sheet, pinça para zoom/pan com dois dedos, alças maiores no toque.
- **Motion** (animações Lottie, carregado sob demanda):
  - **Criar**: camadas de texto, retângulo, elipse, estrela, polígono, SVG importado (logo/ícone vira forma animável) e imagem. Linha do tempo com keyframes arrastáveis, barras de entrada/saída, auto-key (◆), easing (linear, acelerar, desacelerar, suave, recuar, passar e voltar, elástico, quicar, segurar). Arrastar, escalar e girar direto no palco.
  - **31 presets em um clique** (entrada, ênfase, saída e loops: aparecer, deslizar, pop, zoom, girar, cair e quicar, desenhar traço, máquina de escrever, pulsar, tremer, balançar, batimento, flutuar…) e animação por letra em textos.
  - **6 modelos** (revelar logo, lower third, carregando, curtida, notificação, texto datilografado). A cena fica salva no navegador; desfazer/refazer.
  - **Abrir Lottie**: `.json` (Bodymovin) e `.lottie` (dotLottie v1/v2). Tocar, scrub quadro a quadro, velocidade, fundo; trocar cores no arquivo todo, editar textos, ocultar/remover camadas (inclusive dentro de precomps), mudar velocidade, recortar frames, redimensionar; desfazer.
  - **Exportar**: Lottie JSON, dotLottie, GIF (com transparência), MP4 (H.264 via WebCodecs), WebM (VP9, muxer próprio), sequência PNG (ZIP), quadro PNG/SVG. Progresso e Parar.
  - Limitação do lottie-web: textos usam fontes instaladas no aparelho (o renderizador canvas não desenha texto sem glifos embutidos; o app usa SVG nesses casos).
- **PDF e Scanner** (carregado sob demanda, `?app=pdf`; `?app=pdf&mode=scan` abre direto a câmera):
  - **Imagens → PDF**: arrastar, colar (Ctrl+V) ou escolher (JPG, PNG, WebP, HEIC, AVIF, GIF, BMP, SVG). Reordenar arrastando pela alça (mouse/toque) ou pelas setas do teclado, ordenar por nome, inverter, girar, remover.
  - **Página**: A4, Carta, Ofício, A3, A5 ou igual à imagem; orientação automática/retrato/paisagem; encaixe inteira/preencher/esticar; margem 0/5/10/20 mm. As miniaturas mostram o papel com o layout real.
  - **Qualidade**: Original (JPEG sem edição entra sem recompressão; PNG fica sem perdas via Flate), Alta 300 dpi, Equilibrada 200 dpi, Compacta 130 dpi. P&B vira imagem de 1 bit (página escaneada com poucas dezenas de KB). Também exporta as páginas como imagens (ZIP).
  - **Scanner**: câmera ao vivo com detecção do documento (bordas por cor + Hough orientado + melhor quadrilátero, num worker), captura automática quando a imagem estabiliza, lanterna, troca de câmera, foto na resolução do sensor (ImageCapture) e revisão opcional. Sem HTTPS/câmera, usa a câmera nativa do aparelho com o mesmo recorte automático.
  - **Recorte e filtros**: correção de perspectiva com a proporção real do papel (focal estimada pelos pontos de fuga, encaixe em A4/Carta quando bate), cantos e bordas arrastáveis com lupa; filtros Original, Realçado (remove sombra/iluminação irregular, papel branco, cores vivas), Cinza e P&B com limiar ajustável. Funciona também em fotos importadas da galeria.
  - Código: `src/lib/scan/` (geometria, detecção, warp, filtros, worker) e `src/lib/pdf/` (gerador de PDF próprio, layout, estado). Sem dependência nova (usa `fflate`).
- **Segurança**: gerador de senhas (níveis, entropia, sem ambíguos), HMAC gerar/validar (SHA-1 a SHA-512).
- **Dev**: UUID v4/v7, gerador de cron com próximos disparos, testador de regex.
- **Conteúdo**: Lorem Ipsum / Mussum Ipsum, QR Code, código de barras.
- **WhatsApp**:
  - **Link** wa.me com mensagem pronta.
  - **Assinatura do webhook (HMAC)**: gera e valida o `X-Hub-Signature-256` da Cloud API (HMAC-SHA256 do corpo bruto com o App Secret), com payload de exemplo e comando cURL pronto para testar o seu endpoint.
  - **WAMID**: decodifica `wamid.…` em número (wa_id), direção (enviada pelo business ou recebida) e id da mensagem. Aceita vários de uma vez ou o JSON inteiro do webhook. Também gera WAMIDs de teste. O formato não é documentado pela Meta (é Base64 de uma struct Thrift); o decodificador foi conferido com os exemplos da documentação.
- **Documentos**: CPF e CNPJ (gerar e validar, inclui CNPJ alfanumérico).
- **API e IA** (ícone de robô na dock): console de todas as ações, com formulário gerado pelo schema e exemplos prontos (link, JS, CLI, MCP).

## Páginas de SEO (conversor e editor online)
432 URLs pré-renderizadas que abrem o app já no modo certo, com texto próprio de cada página: `src/lib/seo/` (catálogo, textos por idioma, JSON-LD) e `src/routes/[slug]`.
- Por idioma (pt, en, es, fr): conversor (`/conversor-de-imagens`, `/image-converter`…), editor (`/editor-de-imagens-online`…), remover fundo, comprimir, redimensionar e 95 pares de formato (`/png-para-webp`, `/heic-to-jpg`, `/jpg-a-pdf`, `/png-en-svg`…).
- Motion/Lottie (por idioma): visualizador, editor, criador de animação, animar texto, Lottie→GIF, Lottie→MP4, Lottie→WebM e JSON→dotLottie (`/visualizador-lottie`, `/lottie-to-gif`, `/crear-animacion-lottie`…).
- Cada página: title/description, canonical, hreflang entre idiomas + x-default, Open Graph, JSON-LD (WebApplication, HowTo, FAQPage, BreadcrumbList) e `<html lang>` certo. O idioma vem da URL; o seletor de idioma leva à versão equivalente.
- `/sitemap.xml` (com hreflang), `/robots.txt` e a seção de imagens no `/llms.txt` (GEO: IAs que pesquisam ferramentas).
- **Domínio**: as URLs absolutas usam `PUBLIC_SITE_URL` (padrão provisório `https://utilitybelt.gustavolara.pro`). Defina no build: `PUBLIC_SITE_URL=https://seu-dominio bun run build`.

## Idiomas
Interface em **português, inglês, espanhol e francês**, no mesmo modelo da landing (`gusdslara.github.io`): seletor na dock, escolha salva em `localStorage['user_language']`, detecção pelo idioma do navegador e inglês como fallback; `<html lang>` acompanha.
- API: `t('area.chave', { var })` e `i18n.lang` / `i18n.tag` de `#lib/i18n/index.svelte.ts` (reativo, Svelte 5).
- Textos em `src/lib/i18n/messages/<área>.ts`, cada arquivo com os 4 idiomas lado a lado. O `pt` define o formato: chave faltando ou sobrando em outro idioma quebra o `bun run check`, e `t()` só aceita chaves que existem.
- As descrições das ações para IA (`/tools.json`, MCP) ficam em inglês de propósito: é o contrato lido pelos modelos. `cron_explain` aceita `language` (en, pt, es, fr).

## IA e automação

Toda ferramenta também é uma **ação** com nome estável e JSON Schema, definida uma vez em `src/lib/ai/actions.ts`.
O mesmo catálogo alimenta todas as interfaces abaixo; nada sai da máquina.

| Quem usa | Como | Onde |
| --- | --- | --- |
| IA de navegador que só abre links e lê a página (Brave Leo, Copilot no Edge, Gemini no Chrome, Comet, Atlas, Claude in Chrome) | `/run?action=<nome>&<param>=<valor>` → JSON em `<pre id="ub-result" data-status="ok\|error">` | `src/routes/run` |
| Agente de navegador com WebMCP | ferramentas registradas em `navigator.modelContext` ao abrir a página | `src/lib/ai/bridge.ts` |
| Agente que executa JS, Playwright, extensões, você no console | `await utilitybelt.call('uuid_generate', { version: 7 })` | `window.utilitybelt` |
| Página que embute o app em iframe | `postMessage({ type: 'utilitybelt:call', id, name, input })` (só ações puras) | `bridge.ts` |
| IA no PC (Claude Desktop/Code, VS Code Copilot, Cursor, Windsurf, Gemini CLI, Zed, Cline) | servidor **MCP stdio**: `bun run mcp` | `cli/mcp.ts` |
| Terminal e scripts | `bun run ub <ação> …` (saída JSON) | `cli/ub.ts` |
| Descoberta | `/llms.txt` (guia para LLMs) e `/tools.json` (catálogo com schemas) | `src/lib/ai/docs.ts` |

**Ações (29 puras)**: `password_generate`, `password_strength`, `hmac_sign`, `hmac_verify`, `hash_digest`, `uuid_generate`, `uuid_inspect`, `cron_explain`, `regex_test`, `timestamp_convert`, `language_detect`, `languages_list`, `code_format`, `text_diff`, `base64`, `url_encode`, `jwt_decode`, `lorem_generate`, `qr_generate`, `barcode_generate`, `whatsapp_link`, `whatsapp_webhook_sign`, `whatsapp_webhook_verify`, `wamid_decode`, `wamid_encode`, `cpf_generate`, `cpf_validate`, `cnpj_generate`, `cnpj_validate`.
**Só no navegador (8)**, controlam a tela e os dados do app: `app_open`, `app_state`, `editor_list_files`, `editor_read_file`, `editor_write_file`, `editor_new_draft`, `clipboard_history`, `clipboard_copy`.

Regras de entrada: parâmetro desconhecido é rejeitado; strings viram número/booleano conforme o schema; defaults aplicados; o erro diz como corrigir. Resposta sempre `{ ok, result }` ou `{ ok: false, error: { code, message } }`.

### Links diretos
- Abrir uma ferramenta na tela: `/?tool=qr`, `/?app=dev&tool=cron`, `/?app=api` (a URL acompanha a navegação).
- Modo automação (API e IA sem o menu lateral): `/?app=api&automation=1`, ou clicando no item API e IA da dock (abre direto nesse modo). Para sair: botão "Sair do modo automação" ou Esc.
- Executar: `/run?action=cpf_generate&count=3`, `/run?action=code_format&language=sql&code=select%201`.
- Entrada complexa: `/run?action=regex_test&input=<JSON codificado na URL>`.

### MCP no PC
O repositório já traz `.mcp.json` (Claude Code) e `.vscode/mcp.json` (VS Code/Copilot): abrir a pasta ativa o servidor. Em outros clientes:

```bash
claude mcp add utilitybelt -- bun run --cwd /caminho/gus-utilitybelt mcp
```

```json
{ "mcpServers": { "utilitybelt": { "command": "bun", "args": ["run", "--cwd", "/caminho/gus-utilitybelt", "mcp"] } } }
```
(Claude Desktop: `claude_desktop_config.json`; Cursor: `~/.cursor/mcp.json`; Gemini CLI: `~/.gemini/settings.json`; Windsurf: `~/.codeium/windsurf/mcp_config.json`.)
`qr_generate` com `format: "png"` também devolve a imagem como conteúdo MCP.

### CLI
```bash
bun run ub                                   # lista as ações
bun run ub help code_format                  # schema
bun run ub uuid_generate --version 7 --count 3
bun run ub cpf_validate 529.982.247-25       # posicional = parâmetro principal
bun run ub password_generate --length 32 --no-symbols --raw
cat query.sql | bun run ub code_format --language postgresql --raw > query.fmt.sql
bun run ub code_format --code @src/app.ts --raw
bun run ub hmac_sign '{"key":"s3cr3t","message":"payload"}'
bun run ub wamid_decode wamid.HBgLMTY1MDM4Nzk0MzkVAgARGBJDQjZCMzlEQUE4OTJBMTE4RTUA
bun run ub whatsapp_webhook_sign --app-secret "$APP_SECRET" --body @payload.json --raw
```
Com `bun link`, os comandos `ub` e `ub-mcp` ficam globais.

### Nova ação
Adicione um objeto em `actions` (`src/lib/ai/actions.ts`) com `name`, `description`, `input` (JSON Schema) e `run`. Ela aparece sozinha no MCP, WebMCP, CLI, `/run`, console, `/tools.json` e `/llms.txt`. Coloque um teste em `actions.test.ts`.

## Scripts
Gerenciador e runtime: **Bun** (`bun.lock`).

```bash
bun install
bun run dev      # desenvolvimento (Vite + HMR)
bun run check    # svelte-check
bun test         # testes das ações (contrato usado pelas IAs)
bun run mcp      # servidor MCP stdio
bun run ub       # CLI
bun run build    # gera build/ estático (SSG, adapter-static)
bun run serve    # build + serve estático em http://127.0.0.1:4174 via devctl (em segundo plano)
bun run stop     # para o que estiver rodando deste projeto
```

`devctl` (em `~/dev/tools/devctl`) lista e controla todos os servidores locais dos projetos: `devctl` mostra o que está no ar (dev, estático, SSR), de onde veio e quais ficaram órfãos; `devctl prune` limpa os órfãos.
