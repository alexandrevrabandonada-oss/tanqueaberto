# Estado da Nação: identidade progressiva aplicada

## Resumo executivo

A identidade progressiva entrou no produto sem login tradicional e sem aumentar atrito no primeiro uso.

O modelo ficou assim:
- visitante aberto continua livre
- apelido persistente local vira a primeira camada de identidade leve
- trust/score remoto continua existindo por baixo
- o Hub e o envio reaproveitam memória local, fila e histórico
- o convite de identidade aparece só quando já existe valor operacional suficiente

## O que foi aplicado

### API única no cliente
- `useProgressiveIdentity()` concentra fase, sinais locais, trust remoto e gatilhos elegíveis.
- A API já é consumida por Hub, envio e superfícies de contexto.

### Persistência local de apelido
- `bomba-aberta:progressive-identity` guarda apelido e metadados locais no navegador.
- O apelido é normalizado, persistido e reaproveitado quando o usuário volta.
- O apelido também pode vir do histórico de envios e do rascunho salvo.

### Fila e histórico
- A fila local agora entra na leitura da identidade progressiva.
- O histórico local da sessão e o estado de retorno ajudam a decidir fase e gatilho.
- O prompt não depende de cadastro clássico.

## Política de gatilho

O prompt leve só aparece quando há valor claro:
- após o primeiro envio concluído
- ou após retornos úteis suficientes no mesmo aparelho
- ou quando existe trust remoto com lastro operacional

Regra prática aplicada:
- primeiro valor, depois convite
- sem popup agressivo na entrada
- sem email, senha ou magic link nesta passada

## UX

O prompt ficou discreto:
- texto curto
- um único campo de apelido
- benefício explícito: continuar de onde parou, ver impacto e recuperar histórico neste aparelho
- dismiss com cooldown local para não insistir cedo demais

## Dif focado

Arquivos ajustados nesta passada:
- [hooks/use-progressive-identity.ts](C:/Projetos/Tanque%20Aberto/hooks/use-progressive-identity.ts)
- [components/identity/progressive-identity-prompt.tsx](C:/Projetos/Tanque%20Aberto/components/identity/progressive-identity-prompt.tsx)

Superfícies que consomem a camada, já integradas ao fluxo:
- [components/hub/collector-hub.tsx](C:/Projetos/Tanque%20Aberto/components/hub/collector-hub.tsx)
- [components/forms/price-submit-form.tsx](C:/Projetos/Tanque%20Aberto/components/forms/price-submit-form.tsx)
- [components/home/home-browser.tsx](C:/Projetos/Tanque%20Aberto/components/home/home-browser.tsx)

## Validação

Executado com sucesso:
- `npm run typecheck`
- `npm run build`
- `npm run verify`

## Nota operacional

Admin e ops continuam isolados com auth forte. Nada nesta passada criou login clássico ou misturou beta com identidade comum.
