#!/bin/bash
# One-time SSL bootstrap: brings nginx up HTTP-only, gets a Let's Encrypt cert
# for the site (apex + www), then reloads nginx with HTTPS.
# Run once from deploy/ after DNS points at this server:  ./init-ssl.sh
set -e

if [ -f .env ]; then
  export "$(grep -E '^SSL_EMAIL=' .env | xargs)"
fi
: "${SSL_EMAIL:?Set SSL_EMAIL in deploy/.env}"

mkdir -p certbot/www certbot/conf

echo "==> Starting nginx (HTTP only)…"
docker compose up -d nginx
sleep 4

echo "==> Requesting certificate for tftlab.com.br (+ www)…"
docker compose run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$SSL_EMAIL" --agree-tos --no-eff-email \
  -d tftlab.com.br -d www.tftlab.com.br

echo "==> Restarting nginx with HTTPS…"
docker compose restart nginx

echo "==> Done. Certificates issued and HTTPS enabled."
