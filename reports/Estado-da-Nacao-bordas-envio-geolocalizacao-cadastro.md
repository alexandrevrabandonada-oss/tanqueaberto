# Estado da Nacao: bordas de envio, geolocalizacao e cadastro

## Diagnostico curto
- A geolocalizacao ainda falava de forma tecnica demais e nao deixava claro quando o GPS estava confiavel, impreciso ou indisponivel.
- O passo do posto no envio sugeria bem, mas o caminho de "nao achei meu posto" nao conseguia concluir de forma confiavel.
- O servidor ainda barrava o cadastro leve de posto novo cedo demais, antes de entrar no ramo de proposta.
- A confirmacao do posto novo nao avançava corretamente no fluxo guiado.
- A prevencao de duplicidade existia no cliente, mas ainda precisava ficar integrada ao fluxo de cadastro simples.

## O que foi ajustado
- `components/forms/price-submit-form.tsx`
- `app/enviar/actions.ts`
- `hooks/use-geolocation.ts`

### Geolocalizacao
- O estado agora fala em linguagem humana: localizacao boa, imprecisa, negada ou indisponivel.
- O fallback ficou sempre simples: buscar por rua, bairro ou nome.
- O CTA de localizacao foi mantido como apoio, nao como magia quebrada.

### Passo do posto no envio
- A sugestao de posto ganhou estados claros de confianca.
- O seletor continua priorizando proximidade, recencia e contexto.
- A leitura visual separa melhor posto certo, posto parecido e posto em revisao de local.

### Fluxo "Nao achei meu posto"
- O caminho de posto novo ficou integrado ao proprio envio.
- O cadastro leve pede apenas o minimo: nome curto, rua/trecho, bairro, bandeira opcional e localizacao aproximada.
- Ao confirmar, o fluxo volta ao envio com o posto novo resolvido no servidor.

### Prevencao de duplicidade
- Antes de concluir um posto novo, o app mostra ate 3 postos parecidos ou proximos.
- A desambiguacao usa nome, proximidade, bandeira e trecho da rua.
- Se existir um posto ja conhecido, o usuario pode troca-lo sem criar outro.

## Antes / Depois
### Antes
- Geolocalizacao parecia tecnica e pouco confiavel.
- O usuario podia cair num cadastro grande ou num fim de fluxo sem saida.
- O servidor podia devolver erro generico antes de aceitar a proposta de posto novo.
- O caminho de duplicidade ficava espalhado.

### Depois
- A geolocalizacao vira estado humano e acionavel.
- O posto novo entra como extensao curta do proprio envio.
- O servidor aceita a proposta leve e cria o posto quando necessario.
- O usuario ve postos parecidos antes de confirmar cadastro novo.

## Validacao
- `npm run build` passou.
- `npm run typecheck` passou.
- `npm run verify` passou.
- O fluxo central de envio nao foi reaberto; apenas as bordas foram endurecidas.

## Observacao operacional
- Persistem apenas warnings antigos de cache do webpack e o warning conhecido de hooks em `components/layout/retention-hub.tsx`, sem bloqueio de release.
