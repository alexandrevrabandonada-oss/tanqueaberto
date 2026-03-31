# Estado da Nação: fluxo zero-decisão do primeiro envio

## Objetivo
Reduzir a fricção do primeiro envio para pessoas de baixa familiaridade digital, transformando `ver posto -> mandar preço` no caminho mais curto possível.

## O que mudou
- O formulário de envio agora entra com narrativa de primeiro uso mais direta: `Foto primeiro. O resto é guiado.`
- Quando o contexto já traz um posto confiável, o envio inicia com o posto sugerido/travado e sem expor a lista completa logo de cara.
- O combustível também passa a entrar sugerido por contexto, com `Trocar` discreto para quem precisa mudar.
- A seleção de posto passou a priorizar proximidade, recência e desambiguação; a lista cega deixou de ser o primeiro contato.
- Campos secundários e ruído visual foram reduzidos no primeiro envio: menos chips, menos alternativas visíveis e menos explicação longa.
- A confirmação final foi encurtada em `app/enviar/actions.ts` para deixar claro que o envio entrou em revisão e qual é o próximo gesto útil.

## Antes / Depois
### Antes
- Lista de postos grande e cega logo no início.
- Muitos campos visíveis ao mesmo tempo.
- Combustível e posto competiam com a foto.
- Primeira leitura exigia mais decisão mental do que o necessário.

### Depois
- Câmera continua dominante.
- Posto pode vir pré-sugerido a partir do contexto, proximidade ou recência.
- Combustível entra sugerido e só é aberto quando necessário.
- A lista de postos fica colapsada atrás de contexto útil.
- O primeiro envio fica mais curto, com menos escolhas visíveis.

## Regras aplicadas
- Se o usuário vier do mapa, lista ou página do posto, o envio pode abrir com posto já travado.
- Se houver um posto mais próximo confiável, ele entra como sugestão automática.
- Se houver sinal forte de combustível, o campo é pré-preenchido.
- O preço continua por último.
- Não há login, onboarding extra ou jargão novo.

## Telemetria adicionada
- `submission_flow_opened`
- `submission_context_autofilled`
- `submission_flow_completed`
- `submission_stage_abandoned`

### O que esses eventos medem
- tempo entre abrir o envio e concluir
- abandono por etapa
- quantas decisões foram puladas por contexto automático
- quanto do fluxo já entrou com posto ou combustível sugeridos

## Arquivos alterados
- [components/forms/price-submit-form.tsx](C:/Projetos/Tanque%20Aberto/components/forms/price-submit-form.tsx)
- [app/enviar/actions.ts](C:/Projetos/Tanque%20Aberto/app/enviar/actions.ts)
- [lib/telemetry/types.ts](C:/Projetos/Tanque%20Aberto/lib/telemetry/types.ts)

## Validação
- `npm run typecheck` passou
- `npm run build` passou
- `npm run verify` passou

## Resultado prático
O primeiro envio deixou de pedir leitura demais cedo demais. O fluxo agora começa pela foto, usa contexto para travar ou sugerir o posto quando possível e só revela o resto quando faz sentido operacionalmente.
