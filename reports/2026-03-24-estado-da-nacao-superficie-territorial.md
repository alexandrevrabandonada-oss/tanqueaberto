# Estado da Naçāo — Superfície Pública Territorial (Fase 24)

## Objetivos Alcançados
Criamos uma face pública organizada e acolhedora para o Bomba Aberta, permitindo que o projeto "fale a língua local" de cada cidade antes mesmo do usuário entrar no app completo.

## Melhorias Implementadas

### 1. Páginas de Destino por Cidade
- **Rotas Dedicadas:** Agora temos URLs limpas como `/cidade/volta-redonda` e `/cidade/barra-mansa`.
- **Readiness Visual:** Cada página mostra o estado real da cobertura (Readiness) e se a cidade está "Consolidada" ou "Em formação", sendo honesto com o usuário sobre o que esperar.
- **Preview de Postos:** Uma mini-lista de postos catalogados serve como prova de valor imediata.

### 2. Mensagem e Engajamento
- **Linguagem Popular:** Explicamos o projeto de forma simples, focando na colaboração comunitária.
- **Chamada para Testers:** CTAs específicos incentivando a entrada no beta para resolver lacunas de dados naquela cidade específica.

### 3. Entrada Contextual (Seamless Entry)
- **Deep Linking:** O botão "Entrar no App" nessas páginas já carrega o mapa com o filtro da cidade aplicado automaticamente.
- **Preservação de Intenção:** O usuário não precisa configurar nada; se ele veio da página de Volta Redonda, o app abre focado em Volta Redonda.

### 4. Share Territorial e Telemetria
- **Metadados Sociais:** Links compartilhados agora mostram títulos e descrições localizadas, aumentando a taxa de clique em grupos de moradores.
- **Funil por Cidade:** Registramos desde a visita à landing (`territorial_landing_visited`) até a conversão em uso real (`territorial_entry_from_landing`).

## Resultado Prático
- Melhor recepção em comunidades locais.
- Facilidade para líderes de grupo divulgarem o projeto em seus bairros.
- Entrada qualificada de novos testers com contexto geográfico definido.

---
*Relatório gerado em 24 de Março de 2026. Onde o asfalto encontra o dado.*
