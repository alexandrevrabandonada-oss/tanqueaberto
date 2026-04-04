# Estado da Nacao: utilidade popular, envio e economize

## Diagnostico curto

O produto ja estava forte para quem tinha foto clara e sabia exatamente qual posto escolher, mas ainda perdia utilidade em tres pontos muito comuns da rua:

- abandono quando nao havia placa, faixa ou prova visual forte
- saida fraca quando o posto nao existia na lista publica
- leitura de preco barato ainda muito parecida com ranking tecnico, e nao com uma ferramenta pratica para abastecer melhor

A passada atacou esses tres pontos sem desmontar mapa, envio e paginas de posto.

## Patch completo

### 1. Fluxo sem placa ou faixa

Arquivos principais:

- `components/forms/price-submit-form.tsx`
- `app/enviar/actions.ts`
- `lib/drafts/submission-draft.ts`
- `app/postos/[id]/page.tsx`

Mudancas:

- o `/enviar` agora bifurca entre:
  - `tem placa/faixa`
  - `sem placa/faixa`
- no modo sem placa/faixa, a pessoa pode seguir com:
  - preco manual
  - origem do preco (`bomba`, `recibo`, `painel interno`, `informacao local`)
  - foto opcional de contexto
- o rascunho local passou a guardar o modo de evidencia e a origem do preco
- no backend, esse modo nao exige foto obrigatoria, mas recebe tratamento operacional mais conservador:
  - sem fast-lane
  - sem autoaprovacao
  - envio forcado para revisao humana reforcada
- quando nao ha foto real, o report continua valido sem quebrar a pagina do posto

### 2. Meu posto nao esta na lista

Arquivos principais:

- `components/forms/price-submit-form.tsx`
- `app/enviar/actions.ts`

Mudancas:

- a saida `Meu posto nao esta aqui` ficou visivel ao lado da busca de posto
- no fluxo publico, entrou uma proposta leve com:
  - nome/apelido do posto
  - bairro
  - cidade
  - endereco ou referencia
  - bandeira opcional
  - GPS quando disponivel
- antes de confirmar, o formulario mostra ate 3 parecidos para evitar duplicata desnecessaria
- no action, a proposta foi flexibilizada:
  - nome + cidade continuam essenciais
  - endereco ou GPS ja bastam para seguir
- a proposta continua integrada ao pipeline existente de revisao e semeadura

### 3. Superficie mais barato

Arquivo principal:

- `components/home/home-deferred-sections.tsx`

Mudancas:

- a area de `Mais baratos agora` deixou de ser so um recorte simples do filtro atual
- agora a home mostra tres leituras praticas:
  - `Perto de voce`
  - `Por bairro`
  - `Por cidade`
- cada card mostra:
  - preco
  - distancia quando houver
  - recencia
  - confianca do dado
- cada item abre o posto e tambem oferece CTA para atualizar o preco na hora
- a linguagem foi puxada para utilidade concreta de abastecimento, nao para ranking abstrato

## Antes e depois

### Antes

- sem foto clara, o envio praticamente travava
- posto ausente na base ainda exigia mais insistencia do usuario do que deveria
- a home mostrava barato, mas ainda sem um corte claro de utilidade popular

### Depois

- o envio aceita contexto manual quando nao ha placa/faixa
- esse modo segue com revisao humana mais conservadora
- o posto ausente ganhou uma proposta leve e visivel no proprio envio
- a home entrega leitura barata em tres cortes operacionais: perto, bairro e cidade
- cada leitura conecta descobrir -> abrir posto -> atualizar preco

## Validacao

Executado com sucesso:

- `npm run typecheck`
- `npm run build`
- `npm run verify`

Observacao do verify:

- o ambiente local ainda recomenda definir `STATION_EDITOR_SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL` e `NEXT_PUBLIC_APP_URL`, mas isso nao bloqueou a validacao
