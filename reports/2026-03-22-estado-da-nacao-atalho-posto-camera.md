# Estado da Nação - Atalho posto -> camera

## O que mudou
- O posto agora leva o usuario direto para a camera com contexto de posto e combustivel preservado.
- O card rapido do mapa passou a mostrar `Abrir camera` como acao principal.
- A tela do posto ganhou CTA explicito de camera no topo, com telemetria de origem.
- O card de lista editorial também ganhou atalho direto para camera.
- O envio ficou mais curto para uso na rua e a confirmacao agora oferece envio em serie no mesmo posto.

## Fluxo pratico
1. Abrir o posto no mapa ou na lista.
2. Tocar em `Abrir camera`.
3. Tirar a foto.
4. Completar combustivel e preco.
5. Enviar.
6. Se fizer sentido, repetir no mesmo posto ou voltar ao mapa.

## Telemetria adicionada
- `camera_opened_from_station`
- `submission_camera_opened`
- `submission_abandoned_before_photo`
- `submission_abandoned_after_photo`
- `submission_series_continued`

## O que ainda depende de campo
- Validar se os testers entendem a diferenca entre `Abrir camera` e `Abrir posto`.
- Medir se o modo compacto reduz abandono de fato.
- Confirmar se o envio em serie aumenta a taxa de segunda submissao.

## Riscos restantes
- Camera mobile depende do comportamento do navegador e da permissao do aparelho.
- A experiencia continua sensivel a rede ruim durante upload.
- Alguns usuarios podem preferir a pagina do posto antes de abrir a camera; por isso o atalho de mapa continua ativo.

## Proximos passos
- Rodar teste de campo e comparar abandono antes/depois.
- Acompanhar o funil `camera aberta -> foto -> preco -> envio`.
- Se a taxa de segunda submissao for baixa, considerar abrir camera automaticamente em contextos mais seguros.
