# Estado da Nação — Frente de Apoio Financeiro

**Data:** 2026-04-02  
**Escopo:** Sustentabilidade e frente de apoio ao Bomba Aberta

---

## 1. Diagnóstico

O Bomba Aberta não tem publicidade, não vende dados, não cobra pelo uso e é mantido inteiramente pela iniciativa VR Abandonada. Não havia nenhuma superfície no produto que tornasse isso visível ao usuário ou que permitisse contribuição voluntária. O projeto crescia sem nenhum canal de retorno financeiro da comunidade que beneficia.

**Problemas identificados:**
- Nenhuma página ou rota dedicada ao apoio financeiro.
- Nenhuma menção de custos, hospedagem ou manutenção em nenhuma tela.
- Fluxo principal (mapa → envio → postos) sem interferência — correto —, mas resultado era invisibilidade total da dependência de infraestrutura paga.
- Não havia link para campanha externa (APOIA.se ou similar) em nenhum ponto do produto.

---

## 2. Decisões de produto

| Decisão | Justificativa |
|---|---|
| Página separada `/apoie`, não modal nem inline | Não criar fricção no caminho quente. Usuário ativo no mapa não deve ver pedido de dinheiro. |
| Entradas discretas em 3 pontos de menor frequência | Hub (fundo), footer do AppShell (sempre visível mas sem destaque) e página /sobre (usuários curiosos). |
| Apontar para APOIA.se, sem pagamento interno | Evita PCI, responsabilidade financeira e complexidade de integração. Desacoplado do app. |
| Transparência separada em 4 blocos | Hospedagem/infra, desenvolvimento, cobertura de postos, operação/moderação. Honesto e verificável. |
| Apoio recorrente como CTA primário | Mais valioso para o projeto do que pontual. CTA pontual existe como secundário. |
| Nenhuma mudança nas rotas principais | `/`, `/enviar`, `/postos`, `/atualizacoes` intactos. |

---

## 3. Patch completo

### Arquivo criado

#### `app/apoie/page.tsx` — **novo**
Página estática com 5 seções:
1. Introdução honesta (sem marketing)
2. Transparência de custos (4 itens com ícone)
3. CTA de apoio recorrente → APOIA.se
4. CTA de apoio pontual → APOIA.se
5. Outras formas de apoiar (uso real do app)

### Arquivos modificados

#### `app/sobre/page.tsx`
Adicionada `SectionCard` final com copy de sustentabilidade e `ButtonLink` para `/apoie`.

**Antes:** última seção era "Foco inicial", sem saída para apoio  
**Depois:** nova seção "Sustentabilidade" com link para `/apoie`

#### `components/hub/collector-hub.tsx`
Adicionado banner discreto no final da coluna principal (`data-layout-role="main"`), fora de todos os blocos condicionais — sempre visível, mas abaixo de todo conteúdo operacional.

**Antes:** última seção era "Memória e atalhos" seguida do fechamento do div  
**Depois:** banner mínimo `"Mantenha o mapa de pé. / Apoiar →"` após as seções do hub

#### `components/layout/app-shell.tsx`
Adicionado `<footer>` logo abaixo do `<main>` com link de texto `"Apoie o projeto"` em `text-white/24` (muito discreto, não compete com navegação).

**Antes:** `AppShell` não tinha footer  
**Depois:** footer com um link, z-index correto, acima do safe-area

---

## 4. Antes / Depois

### `/apoie` (antes: 404 → depois: página estática)
```
ANTES: rota inexistente
DEPOIS: 5 seções ordenadas — intro, transparência, recorrente, pontual, outras formas
Build size: 1.84 kB / first load 125 kB (leve, sem JS client desnecessário)
```

### `/sobre`
```
ANTES: 5 seções terminando em "Foco inicial"
DEPOIS: 6 seções, última é "Sustentabilidade" com link para /apoie
```

### `/hub`
```
ANTES: lista de seções operacionais terminando em "Memória e atalhos", nada sobre apoio
DEPOIS: banner mínimo abaixo de tudo — nunca bloqueia ação operacional
```

### AppShell (todas as rotas)
```
ANTES: main sem footer
DEPOIS: footer com texto "Apoie o projeto" em cor text-white/24 — quase invisível para quem usa, mas presente para quem procura
```

---

## 5. Arquitetura técnica

- **Rota `/apoie`**: Next.js App Router, server component, renderizado como estático (SSG). Sem `force-dynamic`, sem dados externos.
- **URL da campanha**: `https://apoia.se/bombaaberta` como constante local (`APOIA_URL`). Para trocar de plataforma, basta alterar uma linha nessa página.
- **Acoplamento**: zero. A página de apoio não importa nenhum dado do Supabase nem estado do usuário. Não afeta bundle de nenhuma outra rota.
- **Acessibilidade**: links externos com `target="_blank" rel="noopener noreferrer"`. CTAs inline com tamanho mínimo de toque (py-3).
- **Mobile-first**: todas as seções usam `SectionCard` com padding sm:p-5, mesmo padrão do restante do app.

---

## 6. O que ficou de fora (deliberadamente)

| Item | Motivo da exclusão |
|---|---|
| Integração de pagamento (Stripe, PIX direto) | Fora de escopo. Aumenta responsabilidade e complexidade. APOIA.se já lida com isso. |
| Widget flutuante / banner sticky de apoio | Criaria fricção no caminho quente. Decidido explicitamente contra. |
| Contador de apoiadores / meta de receita | Dado externo que precisaria de API. Dependência desnecessária neste momento. |
| Entrada no bottom-nav | 4 itens já cobrem os fluxos principais. Apoio não é função primária. |
| Gamificação de apoio (badges, etc.) | Escopo fora da solicitação. Pode ser avaliado depois. |

---

## 7. Verificação

```
✅ next build — exit 0, sem erros de tipo
✅ /apoie compilado como static (○)
✅ /sobre compilado como static (○) 
✅ /hub compilado como dynamic (λ) — sem regressão
✅ AppShell compilado sem erro — todas as rotas mantêm build size
✅ Fluxo /enviar, / (home), /postos, /atualizacoes intactos
✅ Links externos com rel="noopener noreferrer"
✅ Nenhum dado do Supabase acessado na nova página
```

---

## 8. Próximos passos sugeridos

1. **Criar campanha real no APOIA.se** com URL `bombaaberta` — a página já está pronta para apontar.
2. **Adicionar PIX direto** como segunda opção na seção de apoio pontual (requer apenas uma linha e chave pública).
3. **Avaliar telemetria** de cliques em `/apoie` via `trackProductEvent` para entender conversão.
4. **Considerar e-mail de agradecimento** para apoiadores identificados (fora do escopo do app, mas APOIA.se oferece isso nativamente).
