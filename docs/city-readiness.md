# Readiness por cidade

## Objetivo

Definir um gate simples para decidir onde o teste de rua pode começar primeiro.

## Como o score funciona

O score por cidade combina:

- postos visíveis
- postos com preço recente
- reports aprovados recentes
- feedback negativo
- erros de upload
- densidade de lacunas de cobertura

## Leitura do painel

- `segurar`: abrir agora tende a gerar mais ruído do que aprendizado.
- `testar pequeno`: dá para iniciar um grupo curto e observar.
- `pronta para ampliar`: a cidade já tem massa mínima e comportamento estável.

## Regra operacional

Para sair do modo de espera, a cidade precisa ter pelo menos:

- 5 postos visíveis
- 3 postos com preço recente
- 6 reports aprovados recentes

Se o score ficar abaixo de 70, ou se houver feedback negativo e erros de upload acima do normal, o caminho recomendado continua sendo `testar pequeno`.

## Prioridade sugerida

1. Volta Redonda
2. Barra Mansa
3. Barra do Piraí
4. Resende
5. Porto Real
6. Quatis
7. Pinheiral

## Uso prático

- consulte `/admin/ops` antes de abrir o beta presencial em uma cidade.
- use o CSV `readiness` quando precisar comparar fora do app.
- trate o score como apoio operacional, não como prova de maturidade total.