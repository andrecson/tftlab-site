#!/bin/sh
# Runs on nginx container start (via /docker-entrypoint.d). Enables the HTTPS
# config only once both certificates exist, so nginx can boot HTTP-only on the
# very first run (before certbot has issued anything).
SITE_CERT="/etc/letsencrypt/live/tftlab.com.br/fullchain.pem"
BOT_CERT="/etc/letsencrypt/live/pagamento.tftlab.com.br/fullchain.pem"

if [ -f "$SITE_CERT" ] && [ -f "$BOT_CERT" ]; then
  echo "[enable-ssl] certificates found — enabling HTTPS."
  cp /etc/nginx/ssl-available.conf /etc/nginx/conf.d/ssl.conf
else
  echo "[enable-ssl] certificates missing — HTTP only. Run ./init-ssl.sh."
  rm -f /etc/nginx/conf.d/ssl.conf
fi
