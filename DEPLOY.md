# Deploy do TFTLab — Vercel + Neon + domínio Hostinger

Guia de publicação do site em produção.

O TFTLab é um app **Next.js full-stack** (server actions, autenticação, ISR) com
banco **Postgres** — ele **não é** um site estático e **não roda** em hospedagem
compartilhada comum. A arquitetura escolhida:

| Peça | Onde | Custo |
|---|---|---|
| App (Next.js) | **Vercel** | Grátis (plano Hobby) |
| Banco (Postgres) | **Neon** | Grátis (free tier) |
| Domínio `tftlab.com.br` | **Hostinger** (já é seu) | já pago |
| Imagens dos ícones | Community Dragon (externo) | — |

O fluxo: código no **GitHub** → Vercel builda e hospeda o app → app fala com o
Postgres da **Neon** → o domínio da **Hostinger** aponta pra Vercel via DNS.

---

## 0. Pré-requisitos (uma vez)

- Conta no **GitHub** (github.com)
- Conta na **Vercel** (vercel.com) — pode logar com o GitHub
- Conta na **Neon** (neon.tech) — pode logar com o GitHub
- Acesso ao **hPanel da Hostinger** (pra editar o DNS do domínio)

---

## 1. Subir o código pro GitHub

Na pasta do projeto (`ralph/`):

```bash
# se ainda não tem remoto:
gh repo create tftlab --private --source=. --push
# ou manualmente:
git remote add origin https://github.com/SEU_USUARIO/tftlab.git
git push -u origin main
```

> O arquivo `.env` **não** vai pro GitHub (está no `.gitignore`) — os segredos
> são configurados direto na Vercel (passo 3). Confira: `git status` não deve
> listar `.env`.

---

## 2. Criar o banco Postgres na Neon

1. Em **neon.tech** → **New Project**.
2. Região: escolha a mais perto do Brasil (ex.: **AWS South America (São Paulo)**
   `sa-east-1`, se disponível; senão `us-east`).
3. Após criar, abra **Connection Details** e copie **duas** strings:
   - **Pooled connection** (o host tem `-pooler`) → vai virar `DATABASE_URL`
   - **Direct connection** (sem `-pooler`) → vai virar `DIRECT_URL`

   Ambas terminam com `?sslmode=require`. Exemplo:
   ```
   DATABASE_URL = postgresql://user:pass@ep-xxx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
   DIRECT_URL   = postgresql://user:pass@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
   ```

> Por que duas? O app (serverless na Vercel) usa a **pooled** pra não estourar
> conexões; as **migrations** usam a **direct**. O `prisma/schema.prisma` já está
> configurado pra isso (`url` + `directUrl`).

---

## 3. Deploy na Vercel

1. Em **vercel.com** → **Add New… → Project** → importe o repositório `tftlab`.
2. Framework: **Next.js** (detectado automaticamente). Não mude o build command —
   o `package.json` tem um script **`vercel-build`** que roda
   `prisma migrate deploy && next build` (aplica as migrations no deploy).
3. Em **Environment Variables**, adicione (escopo **Production**, e de preferência
   também **Preview**):

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | string **pooled** da Neon |
   | `DIRECT_URL` | string **direct** da Neon |
   | `AUTH_SECRET` | gere com `openssl rand -base64 33` |
   | `AUTH_TRUST_HOST` | `true` |
   | `NEXT_PUBLIC_SITE_URL` | `https://tftlab.com.br` |
   | `ADMIN_EMAIL` | e-mail do admin (ex.: `bruno.benedetti@hotmail.com`) |
   | `ADMIN_PASSWORD` | uma senha **forte** |
   | `CURATOR_EMAIL` | login do curador (ex.: `tftlab`) |
   | `CURATOR_PASSWORD` | uma senha **forte** |

   Opcionais (deixe em branco pra desativar): `NEXT_PUBLIC_ANALYTICS_DOMAIN`,
   `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_ERROR_REPORTING_URL`.

4. Clique **Deploy**. O primeiro build roda as migrations e sobe o app numa URL
   `*.vercel.app`.

> ⚠️ Troque `ADMIN_PASSWORD`/`CURATOR_PASSWORD` pelos padrões de teste
> (`tftlab/tftlab`) por senhas fortes **antes** de ir ao ar.

---

## 4. Popular o banco (uma vez)

As **migrations** (estrutura das tabelas) já rodaram no build. Falta os **dados**.
Rode localmente apontando pro Neon (substitua pelas suas strings):

```bash
# no ralph/, temporariamente com as URLs da Neon:
export DATABASE_URL="postgresql://...-pooler...neon.tech/neondb?sslmode=require"
export DIRECT_URL="postgresql://...neon.tech/neondb?sslmode=require"

# 1) usuários (admin + curador) + config inicial:
npm run db:seed

# 2) catálogo (campeões/itens/augments do Community Dragon):
npm run catalog:import
```

Depois é só logar em `https://tftlab.com.br/admin/login` com o
`CURATOR_EMAIL`/`CURATOR_PASSWORD` e criar/publicar as comps.

### (Opcional) Levar as comps que você já criou local → produção

Se quiser migrar os dados que já estão no seu Postgres local em vez de recriar:

```bash
# exporta o banco local (só dados) e restaura no Neon:
pg_dump --data-only --no-owner \
  "postgresql://postgres:postgres@localhost:5432/metacomps?schema=public" \
  > tftlab-data.sql
psql "postgresql://...neon.tech/neondb?sslmode=require" < tftlab-data.sql
```

> Nesse caso **não** rode o `db:seed`/`catalog:import` antes (pra não duplicar).
> Rode só as migrations (já feitas no build) e o restore.

---

## 5. Ligar o domínio tftlab.com.br

1. **Na Vercel**: Project → **Settings → Domains** → adicione `tftlab.com.br` e
   `www.tftlab.com.br`. A Vercel mostra os registros DNS a usar.
2. **Na Hostinger** (hPanel → **Domínios → tftlab.com.br → Zona DNS / DNS Zone**):
   - Registro **A**: host `@` → valor `76.76.21.21` (IP que a Vercel indicar)
   - Registro **CNAME**: host `www` → valor `cname.vercel-dns.com`
   - **Remova** registros A antigos do `@` (ex.: apontando pro parking da Hostinger)
     que conflitem.
3. Aguarde a propagação (minutos a algumas horas). A Vercel emite o **SSL
   (HTTPS)** automaticamente quando o DNS resolve.

> Use **sempre** os valores exatos que a tela de Domains da Vercel mostrar — se
> ela pedir para trocar os nameservers em vez de registros A/CNAME, siga o que
> ela indicar. O importante é que só o DNS mude na Hostinger; o domínio continua
> sendo seu, comprado lá.

---

## 6. Conferir

- `https://tftlab.com.br` abre a tier list (HTTPS, cadeado válido)
- `https://tftlab.com.br/admin/login` → login do curador funciona
- Builder, guias e edição de comps funcionam
- `https://tftlab.com.br/sitemap.xml` e `/robots.txt` respondem

---

## 7. Atualizações futuras

Deploy é automático: todo `git push` na branch `main` dispara um novo build na
Vercel (com `prisma migrate deploy` embutido). Fluxo típico:

```bash
git add -A && git commit -m "..." && git push
```

- **Mudou o schema?** Rode `npx prisma migrate dev --name X` localmente (gera a
  migration), commite e dê push — a Vercel aplica no deploy.
- **Atualizou o patch do TFT?** Use o botão **Re-importar catálogo** no admin, ou
  rode `npm run catalog:import` apontando pro Neon.
- **Cache/ISR**: publicar/editar comps pelo admin revalida a tier list e as
  páginas afetadas automaticamente.

---

## Referência rápida — variáveis de ambiente

| Variável | Obrigatória | Onde |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon (pooled) |
| `DIRECT_URL` | ✅ | Neon (direct) |
| `AUTH_SECRET` | ✅ | gerar (`openssl rand -base64 33`) |
| `AUTH_TRUST_HOST` | ✅ | `true` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://tftlab.com.br` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | ✅ | você define |
| `CURATOR_EMAIL` / `CURATOR_PASSWORD` | ✅ | você define |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | ⬜ | Plausible (opcional) |
| `NEXT_PUBLIC_SENTRY_DSN` | ⬜ | Sentry (opcional) |
| `NEXT_PUBLIC_ERROR_REPORTING_URL` | ⬜ | coletor de erros (opcional) |

O modelo completo está em **`.env.example`**.
