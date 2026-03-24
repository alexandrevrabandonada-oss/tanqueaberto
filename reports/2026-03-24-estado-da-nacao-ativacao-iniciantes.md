# Estado da Nação — Ativação de Iniciantes 1.0

## Objetivos Alcançados
Eliminamos o estado "bonito mas vazio" do Hub para novos usuários, substituindo-o por um funil de conversão operacional de alta velocidade.

## 1. O "Posto Alfa" como Guia
Implementamos uma lógica de sugestão inteligente no `HomeBrowser`:
- O app identifica o primeiro posto da lista `orderedStations` (o que tem a melhor combinação de proximidade e gap de dados).
- Este posto é "marcado" no foco operacional do iniciante como o seu primeiro alvo real.

## 2. Card de Ativação (Missão Zero)
O Hub agora apresenta um card exclusivo de ativação para quem ainda não tem envios:
- **Próximo Passo Inequívoco**: Nome do posto e motivo da urgência ("Maior lacuna de dados").
- **Barra de Jornada**: Visual progressivo `Perfil -> Cidade -> Envio`. Se o usuário já escolheu (ou caiu via smart default) em uma cidade, ele já começa com 66% de conclusão.
- **CTA de Ataque**: Botão "Iniciar Coleta Agora" que pula etapas e abre a câmera direto no posto alvo.

## 3. Telemetria de Funil (0 a 1)
Medimos a eficiência da "escada curta":
- **`hub_activation_click`**: Quando o iniciante morde a isca do posto sugerido.
- **`first_submission_milestone`**: O momento exato em que o status muda de "Espectador" para "Colaborador Ativo".

## Resultados Esperados
- Redução drástica no tempo entre o primeiro login e o primeiro envio.
- Aumento na taxa de retenção pós-primeira visita ao Hub.

---
*Relatório de ativação territorial focado em romper a inércia do novo coletor.*
