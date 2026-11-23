// Helper de namespace: o objeto `pt` define o formato; en/es/fr precisam ter exatamente as mesmas chaves
// (chave faltando ou sobrando = erro no `bun run check`).
type Shape<T> = T extends string ? string : T extends readonly string[] ? readonly string[] : { [K in keyof T]: Shape<T[K]> };

export function ns<const T>(d: { pt: T; en: Shape<T>; es: Shape<T>; fr: Shape<T> }) {
	return d as { pt: Shape<T>; en: Shape<T>; es: Shape<T>; fr: Shape<T> };
}
