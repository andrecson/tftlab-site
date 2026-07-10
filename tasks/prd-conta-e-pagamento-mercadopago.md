# PRD: Área de conta do cliente + pagamento via Mercado Pago (checkout transparente)

> Namespace de histórias: `PAY-0xx` (não colidir com os `US-0xx` já usados no código).
> Repo: `andrecson/tftlab-site`. Stack: Next.js 15 (App Router) + Prisma/Postgres + next-auth v5.

## 1. Introdução / Visão geral

Hoje, pra assinar o TFTLab, o cliente escolhe a forma de pagamento e é jogado direto na
tela de autorização do Discord **antes** de pagar (via `/api/discord/login` →
`/api/discord/callback`), e só depois cai num link hospedado de checkout (Stripe
Payment Link ou Mercado Pago). Isso quebra a expectativa no pior momento do funil e usa
dois gateways diferentes.

Este projeto refaz a camada de conta e pagamento com três mudanças:

1. **Área de login do cliente** ("Entrar com Discord"), reusando a instância de
   `next-auth` que já protege o `/admin`, adicionando um provider Discord ao lado do
   Credentials do admin.
2. **Gateway único: Mercado Pago, em checkout transparente** (formulário de cartão e QR
   de Pix na própria tela do site, sem redirecionar pra links do MP).
3. **Checkout de convidado**: dá pra pagar sem logar, e o vínculo com o Discord acontece
   **depois** do pagamento (tela de sucesso + link assinado no email). Assim o Discord
   deixa de aparecer antes de pagar.

O que **não** muda: o cargo do Discord como entitlement, o cron de expiração
(`expireLapsedSubscribers` + `currentPeriodEnd`), a orquestração em
`src/server/subscriptions.ts` e os emails de confirmação. Só troca o miolo do checkout e
do webhook pro Mercado Pago, e entra a camada de conta/login.

## 2. Objetivos

- Remover a autorização do Discord de antes do pagamento; o cliente paga primeiro e
  vincula o Discord depois (ou entra com Discord por conta própria, e aí compra sem
  atrito).
- Consolidar em **um único gateway (Mercado Pago)**, em **checkout transparente** (sem
  redirect), com Pix comum e cartão recorrente na Fase 1 e Pix Automático na Fase 2.
- Dar ao cliente uma **área de conta** (`/conta`) onde ele vê o status da assinatura,
  assina/renova, cancela a recorrência e reentra no servidor.
- Fazer a transição da Stripe sem atrito pra quem já paga (grandfather): não aceitar
  novas assinaturas Stripe, mas manter os assinantes atuais rodando até saírem.
- Manter o custo baixo e a segurança adequada (cartão tokenizado no navegador, nunca no
  servidor).

## 3. Histórias de usuário

### Fase 1

#### PAY-001: Provider Discord no next-auth (login do cliente)
**Descrição:** Como cliente, quero entrar no site com minha conta do Discord para que o
site me reconheça sem eu ter que criar usuário e senha.

**Critérios de aceite:**
- [ ] Adicionar o provider Discord em `src/auth.ts` ao lado do Credentials existente,
      com escopos `identify email guilds.join`.
- [ ] Callbacks `jwt`/`session` (em `src/auth.config.ts`) passam a discriminar o tipo de
      sessão: admin carrega `role` (como hoje); cliente carrega `discordId`,
      `discordUsername` e `email`, e um marcador `kind: "customer"`.
- [ ] Atualizar `src/types/next-auth.d.ts` para o novo shape (campos de cliente
      opcionais, sem quebrar o admin).
- [ ] O provider Credentials do admin continua funcionando exatamente como antes.
- [ ] Typecheck e lint passam.

#### PAY-002: Entrar no servidor do Discord no login
**Descrição:** Como cliente, quero já entrar no servidor do Discord assim que faço login
para não precisar de um convite separado.

**Critérios de aceite:**
- [ ] No evento de sign-in do Discord, chamar `joinGuild(profile.id, account.access_token)`
      (reusar `src/lib/discord.ts`), adicionando o usuário como membro livre (sem cargo).
- [ ] Falha no `joinGuild` não bloqueia o login (best-effort, logada).
- [ ] Nenhum cargo de assinante é concedido neste passo (o cargo continua vindo do
      webhook de pagamento).
- [ ] Typecheck e lint passam.

#### PAY-003: Página `/entrar` (Entrar com Discord)
**Descrição:** Como cliente, quero uma tela de login limpa com um botão "Entrar com
Discord" para acessar minha conta.

**Critérios de aceite:**
- [ ] Rota `/entrar` com um único botão "Entrar com Discord" que chama
      `signIn("discord", { callbackUrl })`.
- [ ] Respeita `?callbackUrl=` para voltar ao destino (ex.: checkout ou `/conta`).
- [ ] Segue o design system do TFTLab (skill `tftlab-design`).
- [ ] Typecheck e lint passam.
- [ ] Verificar no navegador (skill de dev-browser).

#### PAY-004: Guard de sessão do cliente
**Descrição:** Como desenvolvedor, quero um helper que exija sessão de cliente para
proteger `/conta` e a rota de checkout autenticado.

**Critérios de aceite:**
- [ ] Helper `requireCustomer()` (análogo ao `requireRole` do admin) que retorna a sessão
      quando há `discordId`, e redireciona pra `/entrar?callbackUrl=...` quando não há.
- [ ] Usado no layout/página de `/conta`.
- [ ] Typecheck e lint passam.

#### PAY-005: Ajuste do middleware (sem loop admin para cliente Discord)
**Descrição:** Como admin, quero que um cliente logado com Discord que digite `/admin` não
caia em loop de redirecionamento.

**Critérios de aceite:**
- [ ] `src/middleware.ts` passa a tratar como "admin logado" apenas sessões com `role`
      (não qualquer `req.auth?.user`).
- [ ] Um cliente Discord (sem `role`) que acessa `/admin/**` é mandado ao login do admin
      sem loop; um admin continua acessando normalmente.
- [ ] O matcher do middleware continua cobrindo apenas `/admin/:path*` (a `/conta` é
      guardada no layout via `requireCustomer`).
- [ ] Typecheck e lint passam.

#### PAY-006: Migração de schema (guest checkout + campos MP)
**Descrição:** Como desenvolvedor, quero guardar um pagamento antes de o cliente vincular
o Discord, e registrar os identificadores do Mercado Pago.

**Critérios de aceite:**
- [ ] `Subscriber.discordId` passa a ser **nulável** e continua `@unique` (Postgres
      permite múltiplos NULL num índice único).
- [ ] Novos campos no `Subscriber` (ou tabela auxiliar de pedido, à escolha da
      implementação): `checkoutToken` (único, para amarrar o pagamento ao vínculo),
      `paymentMethod` (`PIX` | `CARD` | `PIX_AUTOMATICO`), `mpPreapprovalId` (assinatura
      de cartão), e reuso de `mpPaymentId`.
- [ ] Novo status ou flag que represente "pago, aguardando vínculo do Discord" (ex.:
      `PENDING` com `paidAt` setado, ou um estado explícito), sem quebrar o cron de
      expiração.
- [ ] Migração Prisma gerada e aplicada; `prisma generate` ok.
- [ ] Typecheck passa.

#### PAY-007: Biblioteca de pagamentos Mercado Pago (transparente)
**Descrição:** Como desenvolvedor, quero funções server-side para criar pagamentos Pix e
assinaturas de cartão no Mercado Pago, e validar webhooks.

**Critérios de aceite:**
- [ ] `src/lib/payments/mercadopago.ts` ganha: criar pagamento Pix (Payments API,
      `payment_method_id: "pix"`, retorna QR base64 + copia-e-cola + id),
      `external_reference = subscriberId/checkoutToken`.
- [ ] Criar assinatura de cartão via **Preapproval API** a partir de um `card_token_id`
      gerado no cliente (ver PAY-008), com `external_reference` e valor/frequência do
      plano.
- [ ] Reusar/estender `verifyMpSignature` para os novos tipos de evento.
- [ ] Sem segredo hardcoded; usa `MP_ACCESS_TOKEN`. Testes unitários das funções puras.
- [ ] Typecheck e lint passam.

#### PAY-008: Componente de checkout transparente (Bricks + Pix)
**Descrição:** Como cliente, quero preencher o cartão ou ver o QR de Pix na própria tela
do TFTLab, sem ser redirecionado para o Mercado Pago.

**Critérios de aceite:**
- [ ] Cartão: usa o SDK do Mercado Pago (MercadoPago.js v2 / Checkout Bricks / Card
      Payment Brick) com `MP_PUBLIC_KEY`, tokenizando o cartão **no navegador**; o número
      do cartão nunca é enviado ao backend do TFTLab (apenas o `card_token_id`).
- [ ] Pix: renderiza o QR code (imagem) e o copia-e-cola retornados pela API, com botão
      "copiar", na própria página.
- [ ] Estados visíveis: aguardando pagamento, aprovado, erro. Pix atualiza status por
      polling e/ou por webhook (a tela reflete a aprovação).
- [ ] Segue o design system do TFTLab.
- [ ] Typecheck e lint passam.
- [ ] Verificar no navegador (skill de dev-browser).

#### PAY-009: Rota `/api/checkout`
**Descrição:** Como cliente, quero iniciar o pagamento do plano escolhido a partir do
site, com minha identidade (quando logado) já anexada.

**Critérios de aceite:**
- [ ] Rota que recebe `plan` (`month`|`year`), `method` (`pix`|`card`) e, quando logado,
      lê `discordId` da sessão; quando convidado, gera/usa um `checkoutToken` (PAY-013).
- [ ] Faz upsert do `Subscriber` pendente (reusar/estender `linkPendingSubscriber`) e cria
      o pagamento/assinatura no MP (PAY-007), devolvendo ao cliente os dados do brick/QR.
- [ ] `external_reference` carrega o identificador para o webhook atribuir depois.
- [ ] Valida `plan`/`method`; erros voltam com código tratável na UI.
- [ ] Typecheck e lint passam.

#### PAY-010: Webhook do Mercado Pago (Pix + assinatura de cartão)
**Descrição:** Como sistema, quero receber as notificações do MP e ativar/renovar/expirar
a assinatura e o cargo do Discord de forma idempotente.

**Critérios de aceite:**
- [ ] `src/app/api/webhooks/mercadopago/route.ts` passa a tratar: pagamento Pix aprovado
      (avulso), `subscription_preapproval` (status da assinatura de cartão) e
      `subscription_authorized_payment` (cobrança recorrente aprovada).
- [ ] Mantém verificação de assinatura (`x-signature`), leitura do recurso pela API
      (nunca confia no payload) e dedupe por `WebhookEvent` (`markEventProcessed`).
- [ ] Pagamento aprovado com `discordId` conhecido → concede cargo e ativa (reusar
      `activateByMpPayment`/`syncStripeSubscription`-equivalente); sem `discordId` (guest)
      → marca como pago-aguardando-vínculo, sem conceder cargo ainda.
- [ ] Renovação de cartão estende `currentPeriodEnd`; cancelamento/expiração revoga o
      cargo. Reusa `grantRole`/`revokeRole`.
- [ ] Testes cobrindo aprovado, duplicado e guest-sem-discord.
- [ ] Typecheck e lint passam.

#### PAY-011: Página `/conta` (painel do cliente)
**Descrição:** Como cliente, quero ver o status da minha assinatura e agir sobre ela.

**Critérios de aceite:**
- [ ] `/conta` (guardada por `requireCustomer`) busca o `Subscriber` por `discordId` e
      mostra: status (nenhuma assinatura / pendente / ativa / expirada / cancelada),
      plano, "acesso até DD/MM" quando ativa, e link/convite do servidor do Discord.
- [ ] Sem assinatura ou expirada: CTA para assinar/renovar (leva ao checkout).
- [ ] Ativa: mostra o método e (se recorrente) o botão de cancelar (PAY-012).
- [ ] Segue o design system do TFTLab.
- [ ] Typecheck e lint passam.
- [ ] Verificar no navegador (skill de dev-browser).

#### PAY-012: Cancelar assinatura recorrente no `/conta`
**Descrição:** Como cliente com cartão recorrente, quero cancelar minha assinatura sozinho.

**Critérios de aceite:**
- [ ] Botão "cancelar assinatura" que chama uma server action/rota que cancela o
      `preapproval` no MP (via `mpPreapprovalId`).
- [ ] Após cancelar, o acesso permanece até `currentPeriodEnd` e depois expira pelo fluxo
      normal (webhook de cancelamento e/ou cron); a UI reflete "cancelada, acesso até X".
- [ ] Pix avulso não mostra cancelar (nada a cancelar, só expira).
- [ ] Typecheck e lint passam.
- [ ] Verificar no navegador (skill de dev-browser).

#### PAY-013: Checkout de convidado (pagar sem logar)
**Descrição:** Como visitante, quero pagar sem antes autorizar o Discord, para não ter
atrito antes de pagar.

**Critérios de aceite:**
- [ ] A partir de `/planos`, é possível ir ao checkout transparente **sem** sessão de
      Discord; o `/api/checkout` cria um `Subscriber` com `discordId = null` e um
      `checkoutToken`, usado como `external_reference`.
- [ ] O pagamento é processado normalmente (Pix ou cartão) e o webhook marca o registro
      como pago-aguardando-vínculo.
- [ ] Nenhuma tela de Discord aparece antes ou durante o pagamento no fluxo de convidado.
- [ ] Typecheck e lint passam.
- [ ] Verificar no navegador (skill de dev-browser).

#### PAY-014: Vínculo do Discord pós-pagamento
**Descrição:** Como cliente que pagou como convidado, quero vincular meu Discord depois do
pagamento para liberar o cargo.

**Critérios de aceite:**
- [ ] Tela de sucesso (com o `checkoutToken`) mostra "Pagamento confirmado. Vincule seu
      Discord para liberar o acesso" e o botão "Entrar com Discord".
- [ ] Após o login, o `discordId` é gravado no registro pago (casando pelo `checkoutToken`)
      e o cargo é concedido (`grantRole`), status vira ativo.
- [ ] Se aquele `discordId` já tiver um `Subscriber`, os registros são consolidados
      (dedupe pelo `discordId` único; o pagamento novo passa a valer, sem duplicar).
- [ ] Typecheck e lint passam.
- [ ] Verificar no navegador (skill de dev-browser).

#### PAY-015: Email de vínculo (fallback do guest)
**Descrição:** Como cliente que fechou a aba antes de vincular, quero um email com um link
para vincular o Discord e liberar o acesso.

**Critérios de aceite:**
- [ ] Após pagamento aprovado sem vínculo, enviar email (reusar `src/lib/email.ts`) com um
      **link assinado** (`/vincular?token=...`) que leva ao "Entrar com Discord" e conclui
      o vínculo (PAY-014).
- [ ] O link é assinado/expira (reusar `src/lib/oauth-state.ts` ou padrão equivalente) e é
      idempotente (clicar duas vezes não duplica).
- [ ] Best-effort: falha de SMTP não quebra o webhook.
- [ ] Typecheck e lint passam.

#### PAY-016: Atualizar `/planos` e o botão de assinar
**Descrição:** Como visitante, quero que os botões de plano me levem ao novo checkout, sem
o desvio pro Discord.

**Critérios de aceite:**
- [ ] `SubscribeButton`/`PlanCard` deixam de apontar pra `/api/discord/login`; passam a
      levar ao checkout transparente (convidado) ou, se logado, direto ao pagamento.
- [ ] A copy da página reflete o novo fluxo (sem "você vincula o Discord antes"); sem uso
      de travessão (—) no texto visível.
- [ ] Preços vêm do `PLANS` em `src/lib/marketing.ts` (Mensal R$80/mês; Anual R$40/mês,
      cobrado R$480/ano).
- [ ] Typecheck e lint passam.
- [ ] Verificar no navegador (skill de dev-browser).

#### PAY-017: Grandfather da Stripe e aposentar rotas antigas
**Descrição:** Como dono do produto, quero parar de vender via Stripe sem prejudicar quem
já assina por lá.

**Critérios de aceite:**
- [ ] O site não oferece mais checkout novo via Stripe (nenhum botão/rota nova cria
      assinatura Stripe).
- [ ] O webhook da Stripe (`src/app/api/webhooks/stripe/route.ts`) e a orquestração
      correspondente **continuam ativos** para renovar/cancelar/expirar os assinantes
      Stripe existentes.
- [ ] Remover `/api/discord/login` e `/api/discord/callback` (substituídos por next-auth +
      `/api/checkout`), garantindo que nada mais os referencia.
- [ ] Typecheck e lint passam.

#### PAY-018: Lembrete de renovação por email (Pix avulso)
**Descrição:** Como cliente de Pix avulso (que não renova sozinho), quero ser avisado antes
do acesso acabar para renovar a tempo.

**Critérios de aceite:**
- [ ] Job/cron que, alguns dias antes de `currentPeriodEnd` (parametrizável), envia um
      email de "seu acesso acaba em X dias, renove aqui" (reusar infra de email e o
      padrão de cron do `expireLapsedSubscribers`).
- [ ] Aplica-se apenas a assinaturas avulsas (Pix comum), não às recorrentes.
- [ ] Não envia duplicado (marca que já lembrou naquele ciclo).
- [ ] Typecheck e lint passam.

### Fase 2

#### PAY-019: Pix Automático (recorrência via Pix)
**Descrição:** Como cliente, quero assinar por Pix recorrente (débito automático) para não
precisar refazer o pagamento todo ciclo.

**Critérios de aceite:**
- [ ] Confirmar e habilitar o Pix Automático na conta do Mercado Pago; validar o contrato
      de API atual na documentação vigente.
- [ ] `/api/checkout` passa a oferecer o método Pix Automático: cria a autorização
      recorrente; o cliente autoriza uma vez no app do banco (passo inerente ao Pix
      Automático do BC, fora do site).
- [ ] Webhook trata as cobranças recorrentes do Pix Automático (ativa/renova/expira e
      concede/revoga cargo), idempotente.
- [ ] `/conta` mostra e permite cancelar a recorrência de Pix Automático.
- [ ] Typecheck e lint passam.
- [ ] Verificar no navegador (skill de dev-browser).

## 4. Requisitos funcionais

- FR-1: O sistema deve permitir login de cliente via Discord (next-auth), separado do
  login de admin (Credentials), na mesma instância de auth.
- FR-2: No login com Discord, o sistema deve adicionar o usuário ao servidor do Discord
  (membro livre, sem cargo).
- FR-3: O sistema deve processar todo o checkout de cartão e Pix na própria página, via
  Mercado Pago transparente, sem redirecionar para links hospedados do MP.
- FR-4: O cartão deve ser tokenizado no navegador (SDK do MP); o backend do TFTLab nunca
  recebe o número do cartão.
- FR-5: O sistema deve permitir pagar como convidado (sem Discord) e vincular o Discord
  depois, concedendo o cargo somente após o vínculo.
- FR-6: O webhook do MP deve atribuir o pagamento via `external_reference`, ser idempotente
  e conceder/revogar o cargo do Discord conforme o status.
- FR-7: O `/conta` deve exibir status, plano, validade do acesso, convite do Discord e
  permitir assinar/renovar e cancelar a recorrência de cartão.
- FR-8: O sistema deve enviar email pós-pagamento com link assinado de vínculo, como
  fallback do guest checkout.
- FR-9: O sistema deve enviar lembrete de renovação por email antes do fim do acesso, para
  assinaturas de Pix avulso.
- FR-10: O sistema deve parar de criar novas assinaturas Stripe, mantendo os assinantes
  Stripe atuais funcionando via webhook até saírem.
- FR-11: (Fase 2) O sistema deve oferecer Pix Automático como método recorrente.

## 5. Fora de escopo (Non-Goals)

- Boleto (removido de vez).
- Migração forçada dos assinantes Stripe atuais para o Mercado Pago (eles seguem no
  grandfather até cancelarem).
- Pix Automático na Fase 1 (fica pra Fase 2).
- Manter AbacatePay ou qualquer terceiro gateway.
- Multi-moeda / internacionalização de pagamento.
- Emissão fiscal / nota / gestão de faturas além do que o MP já provê.
- Contas com múltiplos assentos / times.
- Login de cliente por email+senha ou outros provedores (só Discord).

## 6. Considerações de design

- Reusar o design system do TFTLab (skill `tftlab-design`): tema dark navy + acento ciano,
  hierarquia forte, sem gradiente/glass gratuito.
- `/entrar`: uma tela enxuta, um botão "Entrar com Discord".
- `/conta`: status em destaque (ativo/expirado), validade do acesso, ações claras
  (assinar/renovar, cancelar, entrar no servidor).
- Checkout transparente: estados de aguardando/aprovado/erro bem visíveis; QR de Pix com
  botão copiar; formulário de cartão via Brick, consistente com o resto do site.
- Sem travessão (—) em qualquer texto visível ao usuário.

## 7. Considerações técnicas

- **Auth:** uma instância next-auth v5, sessão JWT, provider Credentials (admin) + Discord
  (cliente) discriminados por `role` vs `discordId`. `src/auth.ts` (Node) adiciona os
  providers; `src/auth.config.ts` (edge) fica sem provider, só verifica o JWT no
  middleware.
- **Mercado Pago transparente:** cartão via MercadoPago.js v2 / Checkout Bricks
  (tokenização client-side, PCI leve tipo SAQ-A); Pix comum via Payments API (retorna QR e
  copia-e-cola); cartão recorrente via Preapproval API com `card_token_id`. Eventos de
  webhook relevantes: pagamento aprovado, `subscription_preapproval`,
  `subscription_authorized_payment`.
- **Atribuição:** `external_reference = Subscriber.id`/`checkoutToken`, como já é feito
  hoje no MP one-time.
- **Reuso:** `src/lib/discord.ts` (`joinGuild`, `grantRole`, `revokeRole`,
  `createGuildInvite`), `src/server/subscriptions.ts` (orquestração + idempotência),
  `src/lib/email.ts`, `expireLapsedSubscribers` (cron), `src/lib/oauth-state.ts` (link
  assinado do email de vínculo).
- **Schema:** `Subscriber.discordId` nulável + `checkoutToken` único + `paymentMethod` +
  `mpPreapprovalId`; estado "pago-aguardando-vínculo".
- **Env novas:** `MP_PUBLIC_KEY` (para o Bricks no cliente). Já existem: `MP_ACCESS_TOKEN`,
  `MP_WEBHOOK_SECRET`, credenciais do Discord, `AUTH_SECRET`.
- **Segurança:** validar assinatura do webhook, ler o recurso pela API (não confiar no
  payload), nunca aceitar cartão cru no backend, dedupe por `WebhookEvent`.

## 8. Métricas de sucesso

- Nenhuma tela de Discord aparece antes do pagamento no fluxo de convidado.
- Um comprador logado consegue assinar em poucos cliques, sem redirect externo.
- Taxa de conclusão de checkout (iniciou → pagou) igual ou maior que a atual.
- Zero cobrança de cartão sem consentimento; cliente consegue cancelar sozinho a
  recorrência.
- Assinantes Stripe atuais continuam renovando/expirando sem intervenção.

## 9. Perguntas em aberto

- **Plano anual no cartão recorrente:** cobra R$480 uma vez por ano com auto-renovação
  anual, certo? E no Pix avulso anual, R$480 à vista liberando 366 dias (como hoje)?
- **Métodos por plano:** oferecer Pix avulso e cartão recorrente para os dois planos
  (Mensal e Anual), ou restringir algum método a algum plano?
- **`MP_PUBLIC_KEY`:** já está disponível na conta/ambiente para o Bricks?
- **Pix Automático (Fase 2):** já está habilitado na conta do Mercado Pago? Confirmar o
  contrato de API vigente na hora de implementar.
- **Consolidação de duplicados no vínculo (PAY-014):** em caso de dedupe por `discordId`,
  manter o histórico do registro antigo ou sobrescrever com o pagamento novo?
