# Deploy na VPS — site TFTLab + bot de pagamento (tudo junto)

Stack única: **site Next.js** (`tftlab.com.br`) + **bot de assinaturas Discord**
(`pagamento.tftlab.com.br`), cada um com seu Postgres, atrás de **um Nginx** com
**SSL** (certbot). Orquestrado por `deploy/docker-compose.yml`.

## 0. Pré-requisitos na VPS
- Ubuntu (ou similar) com **Docker** + **Docker Compose v2** instalados
- Portas **80** e **443** abertas
- Acesso ao **DNS** de `tftlab.com.br` (na Hostinger)

## 1. DNS (na Hostinger)
Aponte para o IP da VPS:
- `A  @            <IP_DA_VPS>`   (tftlab.com.br)
- `A  www          <IP_DA_VPS>`
- `A  pagamento    <IP_DA_VPS>`

> ⚠️ Isso troca o site atual pelo novo. Faça quando for realmente ao ar.

## 2. Clonar os dois repositórios
```bash
sudo mkdir -p /opt/tftlab && sudo chown "$USER" /opt/tftlab
git clone <repo-do-site> /opt/tftlab
git clone https://github.com/andrecson/tftlab.git /opt/tftlab/bot
cd /opt/tftlab/deploy
```
(Layout esperado: `/opt/tftlab` = site, `/opt/tftlab/bot` = bot, comandos rodados em `/opt/tftlab/deploy`.)

## 3. Configurar o `.env`
```bash
cp .env.example .env
# preencha: senhas de banco, AUTH_SECRET, tokens do Discord, chaves Stripe/MP,
# SMTP e SSL_EMAIL. Os payment links já vêm preenchidos.
```

## 4. Subir a stack
```bash
docker compose build
docker compose up -d
```
- O **site** roda `prisma migrate deploy` no start; **popule o catálogo/usuários** uma vez:
  ```bash
  docker compose exec site node_modules/.bin/prisma db seed
  ```
  (ou importe o catálogo pelo admin depois de logar)
- O **bot** roda `prisma migrate deploy` no start automaticamente.

## 5. Emitir o SSL
```bash
./init-ssl.sh          # emite os certs dos 2 domínios e religa o nginx com HTTPS
```

## 6. Ligar os webhooks (nos painéis)
- **Stripe** → Webhooks → endpoint `https://pagamento.tftlab.com.br/api/webhooks/stripe`
- **Mercado Pago** → notificações → `https://pagamento.tftlab.com.br/api/webhooks/mercadopago`
- **Discord** (OAuth2) → redirect `https://pagamento.tftlab.com.br/api/link/callback`
- Confirme que os **Payment Links** (Stripe/MP) estão ativos e batem com os planos.

## 7. Conferir
- `https://tftlab.com.br` (site, HTTPS válido)
- `https://pagamento.tftlab.com.br/health` → `{"status":"ok"}`
- Fluxo: assinar (Pix/cartão) → pagar → receber link → vincular Discord → cargo

## Atualizações
```bash
cd /opt/tftlab && git pull
cd deploy && docker compose up -d --build
```

## Notas
- Dados dos bancos ficam em `deploy/data/` (persistem entre deploys).
- Renovação de SSL é automática (serviço `certbot`).
- Logs: `docker compose logs -f site` / `... bot` / `... nginx`.
