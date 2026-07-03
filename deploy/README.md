# Deploy na VPS — site TFTLab (tudo num app só)

Stack: **site Next.js** (`tftlab.com.br`) com seu Postgres, um **cron** de
expiração de assinaturas, atrás de **um Nginx** com **SSL** (certbot). Pagamento
(Stripe recorrente + Mercado Pago avulso) e a concessão do **cargo de assinante
no Discord** rodam **dentro do próprio site** — não há bot separado. Orquestrado
por `deploy/docker-compose.yml`.

## 0. Pré-requisitos na VPS
- Ubuntu (ou similar) com **Docker** + **Docker Compose v2** instalados
- Portas **80** e **443** abertas
- Acesso ao **DNS** de `tftlab.com.br` (na Hostinger)

## 1. DNS (na Hostinger)
Aponte para o IP da VPS (3 registros):
- `A  @      <IP_DA_VPS>`   (tftlab.com.br)
- `A  www    <IP_DA_VPS>`
- `A  app    <IP_DA_VPS>`   (app.tftlab.com.br — usado pelos webhooks)

> ⚠️ Isso **troca o site atual** pelo novo em `tftlab.com.br`. Faça backup/anote
> a config do site atual ANTES, e só mexa quando for realmente ao ar.

## 2. Clonar o repositório
```bash
sudo mkdir -p /opt/tftlab && sudo chown "$USER" /opt/tftlab
git clone <repo-do-site> /opt/tftlab
cd /opt/tftlab/deploy
```
(Layout esperado: `/opt/tftlab` = site, comandos rodados em `/opt/tftlab/deploy`.)

## 3. Configurar o `.env`
```bash
cp .env.example .env
# preencha: senha do banco, AUTH_SECRET, logins admin/curador, as chaves do
# Discord/Stripe/Mercado Pago e o CRON_SECRET. Os payment links já vêm prontos.
```

## 4. Subir a stack
```bash
docker compose build
docker compose up -d
```
- O **site** roda `prisma migrate deploy` no start (aplica as migrations sozinho).
- Crie os **usuários** admin/curador (uma vez):
  ```bash
  docker compose exec site node prisma/seed-users.cjs
  ```
- Depois **logue no admin** (`/admin/login`) e clique em **“Re-importar catálogo”**
  pra popular campeões/itens/traits/augments do patch atual.

## 5. Emitir o SSL
```bash
./init-ssl.sh          # emite o cert (tftlab.com.br + www + app) e liga o HTTPS
```

## 6. Ligar pagamento + Discord (nos painéis)
- **Discord** (discord.com/developers): OAuth2 → Redirect
  `https://tftlab.com.br/api/discord/callback`; bot com permissão **Manage
  Roles**, e o cargo do bot **acima** do cargo de assinante.
- **Stripe** → Webhooks → `https://tftlab.com.br/api/webhooks/stripe`
  (eventos `checkout.session.completed`, `invoice.paid`,
  `customer.subscription.updated|deleted`).
- **Mercado Pago** → notificações → `https://tftlab.com.br/api/webhooks/mercadopago`
- Confirme que os **Payment Links** (Stripe/MP) estão ativos e batem com os planos.

## 7. Conferir
- `https://tftlab.com.br` (site, HTTPS válido)
- Fluxo: `/planos` → vincular Discord → pagar (Pix/cartão) → cargo concedido
- O cron de expiração roda sozinho (serviço `cron`, de hora em hora).

## Atualizações
```bash
cd /opt/tftlab && git pull
cd deploy && docker compose up -d --build
```

## Notas
- Dados do banco ficam em `deploy/data/site-db/` (persistem entre deploys).
- Renovação de SSL é automática (serviço `certbot`).
- Logs: `docker compose logs -f site` / `... nginx` / `... cron`.
