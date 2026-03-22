# Launch Gate - Beta Fechado

Data: 2026-03-22

## Critérios mínimos
- Pelo menos 20 postos visíveis no mapa público.
- Pelo menos 8 postos com preço recente aprovado.
- Pelo menos 3 cidades com alguma densidade de leitura.
- Cron diário de refresh ativo.
- Cron semanal de dossiês ativo.
- RLS e admin protegidos funcionando.
- Upload de foto funcionando no bucket de produção.
- Logs básicos de execução disponíveis no painel interno.

## Sinais de que ainda não está pronto
- Mapa quase todo sem preço recente.
- Menos de 3 cidades com massa mínima.
- Falha recorrente no refresh ou na geração de dossiês.
- Tela do posto sem cadastro territorial visível.
- Admin desprotegido ou com ações quebrando em silêncio.

## Leitura operacional
- "Posto cadastrado" significa que o território já está mapeado.
- "Preço recente" significa que existe um report aprovado dentro da janela útil.
- A base pode entrar em beta mesmo com lacunas, desde que essas lacunas estejam explícitas e acionáveis.

## Próximo ajuste esperado
- Aumentar a massa de preços recentes por cidade prioritária antes de ampliar o beta.
