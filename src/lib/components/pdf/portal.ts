// Move o elemento para o <body>: overlays em tela cheia escapam do backdrop-filter da janela
// (que vira o "containing block" de position: fixed).
export function portal(node: HTMLElement) {
	document.body.appendChild(node);
	return {
		destroy() {
			node.remove();
		}
	};
}
