#!/usr/bin/env bash
# Deploy do site estático na VPS (Caddy em Docker) usando ~/dev/tools/vps-deployer.
#   bun run deploy                      # usa a chave do config.json do deployer
#   VPS_KEY=~/.ssh/id_ed25519 bun run deploy
# Gera o build com o domínio final (canonical, sitemap, hreflang), envia para /var/www/<domínio>
# e grava um bloco próprio no Caddyfile: o bloco padrão do deployer (try_files → /index.html)
# quebraria as 400 páginas pré-renderizadas (cada rota é um .html).
set -euo pipefail

DOMAIN="${DOMAIN:-utilitybelt.gustavolara.pro}"
DEPLOYER="${DEPLOYER:-$HOME/dev/tools/vps-deployer/deployer.py}"
ROOT="/var/www/$DOMAIN"
KEY_ARGS=()
if [[ -n "${VPS_KEY:-}" ]]; then KEY_ARGS=(--key "$VPS_KEY"); fi

cd "$(dirname "$0")/.."

echo "› build (PUBLIC_SITE_URL=https://$DOMAIN)"
PUBLIC_SITE_URL="https://$DOMAIN" bun run build

echo "› envio para $ROOT"
python3 "$DEPLOYER" "${KEY_ARGS[@]}" deploy static build --domain "$DOMAIN" --no-caddy

# Bloco do Caddy. URLs sem barra final (trailingSlash 'never'): /png-para-webp → png-para-webp.html.
# Assets com hash ficam em cache por 1 ano; HTML sempre revalida.
EXTRA=$(cat <<CADDY
root * $ROOT
header {
	Strict-Transport-Security "max-age=31536000; includeSubDomains"
	X-Content-Type-Options "nosniff"
	Referrer-Policy "strict-origin-when-cross-origin"
	Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()"
	-Server
}
@immutable path /_app/immutable/*
header @immutable Cache-Control "public, max-age=31536000, immutable"
@revalidate not path /_app/immutable/*
header @revalidate Cache-Control "public, max-age=0, must-revalidate"
@slash path_regexp slash ^(.+)/\$
redir @slash {re.slash.1} 308
try_files {path} {path}.html {path}/index.html
file_server
handle_errors 404 {
	rewrite * /404.html
	file_server
}
CADDY
)

echo "› Caddy: $DOMAIN"
python3 "$DEPLOYER" "${KEY_ARGS[@]}" caddy add-domain "$DOMAIN" --extra "$EXTRA"

echo "› conferindo"
for path in / /png-para-webp /image-converter /sitemap.xml /robots.txt /llms.txt; do
	code=$(curl -s -o /dev/null -w '%{http_code}' "https://$DOMAIN$path" || true)
	echo "  $code  https://$DOMAIN$path"
done
