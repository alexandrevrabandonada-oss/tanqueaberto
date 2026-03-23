# Relatório Geral do Estado do Projeto — Março de 2026

## 1. Visão Geral (O Bomba Aberta Hoje)
O Bomba Aberta evoluiu de um protótipo de captura de preços para uma plataforma operacional completa e resiliente, desenhada especificamente para uso de rua sob condições adversas. Consolidamos o **Ciclo Completo do Coletor**, do disparo da câmera à aprovação administrativa em lote.

---

## 2. Pilares Tecnológicos Concluídos

### A. Arquitetura "Camera-First" & Fila Local
- **Resiliência Total:** O app prioriza a captura da imagem e o armazenamento local imediato. Mesmo sem sinal de internet (3G/4G fraco), o tester completa a missão e o app tenta o upload em background com retentativas automáticas.
- **Rascunho Persistente:** O formulário de preço não se perde se o usuário alternar de app ou receber uma chamada no meio da coleta.

### B. Curadoria & Inteligência Territorial
- **Readiness por Cidade:** O sistema calcula automaticamente se uma cidade está pronta para o beta aberto baseado em densidade de postos e recência de preços.
- **Páginas de Desembarque Localizadas:** Criamos entradas específicas (`/cidade/[slug]`) que preparam o usuário com o contexto local, facilitando o compartilhamento em grupos de bairro.
- **Assistente de Rota e Missão:** O app agora orienta fisicamente o tester até o próximo posto prioritário, integrando com **Waze** e **Google Maps**.

### C. Qualidade e Integridade do Dado
- **Anti-Spam e Reuso:** Hashing de imagens impede o upload de fotos repetidas de galeria em janelas curtas.
- **Moderação em Lote:** O time operacional agora processa reports redundantes com um único clique, usando guardrails de variância para garantir que divergências de preço não sejam ignoradas.
- **Análise de Qualidade de Imagem:** Heurísticas client-side avisam o usuário antes do envio se a foto estiver muito escura ou embaçada.

---

## 3. Performance e Experiência de Rua
- **Modo Low-Perf Automático:** O app detecta conexões lentas e desabilita efeitos visuais caros (blur, sombras pesadas) para manter a fluidez.
- **Virtualização de Lista:** Renderizamos apenas o conteúdo necessário na home, permitindo rolagem leve mesmo em aparelhos mais antigos.

---

## 4. Próximos Passos (Próximo Trimestre)
1.  **Abertura Controlada (Beta Público):** Transição do modelo de convite manual para o "Rollout Territorial" baseado em prontidão.
2.  **Alertas de Regressão de Dado:** Notificação ativa para moderadores quando a confiança de uma região cai abaixo da média.
3.  **Gamificação e Retenção Operacional:** Mecanismos simples para incentivar o retorno recorrente dos testers de maior confiança.

---
**Relatório gerado em 24 de Março de 2026.**
*O Bomba Aberta é agora uma ferramenta profissional de soberania cívica e transparência de preços.*
