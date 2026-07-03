# Design

> Sistema visual do TFTLab — escuro navy + acento ciano, herdado do tftlab.com.br. Tailwind + CSS variables (HSL) em `src/app/globals.css`. Fonte Inter (`next/font`).

## Visual Theme
Interface escura, plana e técnica. Elevação por cor/borda, não por sombra. Acento ciano usado com parcimônia — ação, estado e "força" da comp. Herda os tokens do tftlab.com.br (mesmo fundo/foreground/primary).

## Color — tokens (HSL, `globals.css`)
- `--background: 224 71% 4%` (#030711) — fundo da página
- `--card: 222 47% 11%` (#0f1729) — painéis/cards
- `--foreground: 213 31% 91%` (#e1e7ef) — texto primário
- `--muted-foreground: 215 20% 65%` — texto secundário
- `--primary: 180 100% 42.5%` (ciano #00d9d9) — ação, links, foco, ênfase de força
- `--secondary: 175 60% 20%` · `--destructive: 0 63% 31%` · `--border: 217 33% 18%`
- Tiers: `--tier-s` vermelho · `--tier-a` laranja · `--tier-b` amarelo · `--tier-c` verde · `--tier-x` cinza-azulado

Estratégia: **Restrained** (neutros + 1 acento). Ciano nunca como decoração de superfície.

## Typography
- Família única: **Inter** (`--font-inter`), mapeada em `fontFamily.sans` do Tailwind. Sem par display/body (register produto).
- Escala rem fixa (não fluida). Pesos: 400 corpo · 500/600 UI · 700+ ênfase.
- Hierarquia por peso/tamanho/opacidade, não por múltiplas famílias.

## Components
- **Hexágono** (`BUILDER_HEX_CLIP`, pointy-top): unidade visual compartilhada — board do builder, board dos guias e capa das comps na tier list. Aro na cor do tier; poço interno escuro `#0a1322`.
- **Tier (tier list)**: faixa/cabeçalho por banda — barra colorida (`bg-tier-*`) no topo com a letra + rótulo "Tier", sobre um painel `bg-card` de borda neutra com as comps. A cor concentra na faixa e no aro dos hexágonos; elevação por borda, não por bloco colorido em volta.
- **Tier badge (comp detail)**: quadrado colorido com a letra + sub-label ("TIER") e colchetes decorativos nos cantos (`comp-header.tsx`). Ainda no estilo antigo — não segue a faixa do tier list.
- **Abas** (painel de itens): ativa = pill sólida ciano (`bg-primary text-primary-foreground`); inativas = texto puro.
- Estados obrigatórios em botões/inputs: default · hover · focus (anel ciano `ring-ring`) · active · disabled.
- Estrelas de campeão: 2–3 (1★ não existe).

## Layout
- `max-w-6xl`, grid base 4px. Guias em 2 colunas (visual à esquerda, texto à direita); colapsa < lg.
- Responsivo estrutural (colapso/breakpoints), não tipografia fluida.

## Motion
- 150–250 ms, transições de estado (hover/foco). Sem sequências de load. `prefers-reduced-motion` respeitado.

## Bans (impeccable + projeto)
- Sem **side-stripe borders** (border-left/right colorido >1px como acento) — pendência conhecida em `admin/tier-list-editor.tsx`.
- Sem **gradient-text** (`background-clip:text`) — já removido do header público.
- Sem **glassmorphism** como default.
