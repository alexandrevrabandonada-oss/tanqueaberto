# Estado da Nação — Share Territorial

## Objetivos Alcançados
Transformamos as superfícies do Bomba Aberta em peças de ativação pública de alto impacto, facilitando a viralização local e qualificada.

## 1. Share Pack Unificado
Implementamos o componente `SharePack` em todas as páginas críticas (Posto, Grupo e Cidade):
- **WhatsApp**: Envio direto com mensagem formatada e URL rastreável.
- **Copy Link**: Feedback tátil e visual para compartilhamento informal.
- **Microcopy Contextual**: "Veja o preço em X" para postos vs "Veja a cobertura em Y" para cidades.

## 2. OG Territorial Dinâmico
Novo motor de geração de imagens via `/api/og/territorial`:
- **Postos**: Preview mostra o preço atual e o destaque da marca.
- **Cidades/Grupos**: Exibe o score de prontidão e o estágio da operação (Beta vs Consolidado).
- **Conversão Visual**: Links compartilhados agora são "autoexplicativos" e geram curiosidade imediata.

## 3. Experiência de Entrada Contextual
Links de share agora carregam o parâmetro `ref=share`. Ao entrar:
- **Banner de Boas-Vindas**: O usuário é recebido com uma mensagem de que entrou via convite local.
- **Redução de Abandono**: A entrada não é mais genérica; o usuário entende imediatamente por que está ali.

## 4. Métricas de Ativação
Novos eventos de telemetria:
- `territorial_shared`: Quem está compartilhando e por qual método.
- `share_link_opened`: Origem e contexto da entrada qualificada.

---
*Relatório focado em crescimento orgânico e ativação territorial.*
