# Estado da Nacao: manual review do posto novo

## Diagnostico curto
A melhora do fluxo de `nao achei meu posto` reduziu abandono, mas a moderacao precisava de mais estrutura para nao virar fila confusa.

O risco principal era este:
- propostas sem geo entrando iguais a propostas com geo;
- nome muito generico ou muito curto passando como se fosse sinal suficiente;
- postos parecidos ficando misturados sem uma leitura simples para o admin.

## O que foi ajustado

### 1. Classificacao simples da proposta
Arquivo: `lib/quality/stations.ts`

Passei a classificar propostas em tres estados:
- `boa para aprovar rapido`
- `precisa revisar`
- `muito vaga`

A classificacao usa sinais simples:
- nome curto;
- rua / trecho;
- bairro;
- bandeira opcional;
- geo confiavel ou ausente;
- risco de duplicidade por nome genérico ou recorte parecido.

### 2. Moderacao territorial com mais contexto
Arquivo: `lib/ops/territorial-curation.ts`

A fila territorial agora carrega:
- label da classificacao;
- motivo curto da classificacao;
- estado da proposta;
- indicacao clara de geo / sem geo / duplicidade provavel.

### 3. Admin com leitura mais direta
Arquivos:
- `components/admin/ops/territorial-curation-panel.tsx`
- `components/admin/ops/station-editorial-queue.tsx`
- `app/admin/ops/qualidade/page.tsx`

A tela de moderacao agora mostra, de forma explicita:
- propostas boas para aprovar rapido;
- propostas que precisam revisar;
- propostas muito vagas;
- proposta com geo e sem geo;
- conflitos e repeticoes visuais.

### 4. Nota de curadoria vinda do envio
Arquivo: `app/enviar/actions.ts`

Ao criar posto novo, a nota de curadoria agora grava o estado da classificacao e o motivo curto.
Isso ajuda o admin a nao precisar inferir tudo olhando os campos brutos.

### 5. Anti-duplicidade mais clara
Arquivo: `lib/quality/stations.ts`

A fila editorial agora usa a mesma classificacao da fila territorial, para evitar que um posto duplicado pareca apenas um item mais fraco da mesma lista.

## Antes / Depois

### Antes
- proposta com geo e sem geo pareciam a mesma coisa para a moderacao;
- posto muito vago podia entrar na fila sem aviso claro;
- duplicidade era percebida tarde demais;
- o admin via muitos campos, mas pouca classificacao operacional.

### Depois
- a moderacao enxerga tres estados simples da proposta;
- o admin sabe quando um posto pode ser aprovado rapido;
- a fila mostra quando a proposta e vaga demais ou parece duplicada;
- o sinal de geo aparece junto da nota de curadoria e da fila.

## Patch focado
- `app/enviar/actions.ts`
- `components/admin/ops/territorial-curation-panel.tsx`
- `components/admin/ops/station-editorial-queue.tsx`
- `app/admin/ops/qualidade/page.tsx`
- `lib/ops/territorial-curation.ts`
- `lib/quality/stations.ts`

## Validacao
- `npm run build` passou
- `npm run typecheck` passou
- `npm run verify` passou

## Observacao
A classificacao fica no admin e na curadoria. O fluxo publico continua leve: a mudanca foi para reduzir fila confusa, duplicidade e aprovacao errada sem reabrir UX.
