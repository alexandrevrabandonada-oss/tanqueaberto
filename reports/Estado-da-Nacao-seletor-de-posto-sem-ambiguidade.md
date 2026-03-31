# Estado da Nacao: Seletor de Posto Sem Ambiguidade

Data de consolidacao: 2026-03-30

## Diagnostico curto

O seletor de posto na rota `/enviar` ainda estava pesado para toque apressado porque misturava itens com pouco contexto visual e mostrava volume demais de uma vez.

Os principais problemas eram:
- nomes parecidos competindo sem desambiguacao suficiente
- bairro sozinho sem ajuda para diferenciar postos proximos
- lista inicial grande demais para uma leitura rapida
- pouca evidencia de distancia e recencia recente no item
- risco de toque errado em contexto de pressa

## O que foi simplificado

- cada item agora mostra nome, bandeira ou `Sem bandeira`, rua/trecho curto, distancia e sinal de ultimo preco recente quando existir
- os resultados foram separados em grupos claros: `Mais proximos de voce`, `Recentes e por onde voce passou` e `Outros postos bem ranqueados`
- os grupos agora mostram poucos itens por padrao e deixam o restante em `Ver mais`
- quando ha selecao com ambiguidade, o fluxo mostra uma confirmacao curta: `É este posto?`
- o posto escolhido ganhou um resumo mais forte, com bandeira, trecho, distancia e ultimo preco recente quando disponivel

## Antes / Depois

### Antes
- lista grande e cega
- muitos postos parecidos sem contexto suficiente
- bairro e nome tinham peso demais
- pouco sinal de proximidade real
- risco maior de selecionar posto errado por toque rapido

### Depois
- poucos itens bons primeiro
- proximidade manda de verdade
- recencia entra no item
- desambiguacao visual clara em cada linha
- confirmacao curta quando ha duvida
- a lista continua forte, mas fica mais controlada e confiavel

## Arquivo tocado

- [components/forms/price-submit-form.tsx](C:/Projetos/Tanque%20Aberto/components/forms/price-submit-form.tsx)

## Validacao

- `npm run typecheck` passou
- `npm run build` passou
- `npm run verify` passou

## Residual

- continuam apenas warnings antigos de cache do webpack no ambiente local
- nao houve regressao no fluxo de envio ou na compatibilidade com contexto vindo de mapa, lista e pagina do posto
