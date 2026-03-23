# Estado da Naçāo — Qualidade da Foto (Fase 21)

## Objetivos Alcançados
Melhoramos a qualidade das evidências coletadas em campo, reduzindo a entrada de fotos inúteis na moderação através de análise em tempo real e processamento inteligente.

## Melhorias Implementadas

### 1. Diagnóstico em Tempo Real (Heurísticas Leves)
- **Análise de Luminância:** O app agora detecta fotos excessivamente escuras ou "estouradas" no momento em que são tiradas.
- **Detecção de Contraste:** Imagens lavadas ou sem definição clara são sinalizadas.
- **Filtro de Resolução:** Garantimos que a imagem tenha densidade de pixels suficiente para leitura de preços na bomba.

### 2. UI Preditiva e Educativa
- **Badges de Confiança:** O usuário vê o estado da foto (Nítida vs Atenção) imediatamente no preview.
- **Sugestão de Refazer:** Se a qualidade for baixa, o app sugere proativamente "Refazer Foto" com mensagens de apoio contextual (ex: "Está muito escuro").
- **Fluxo Não-Bloqueante:** Mantivemos a agilidade de rua — o usuário pode ignorar o aviso se estiver em uma situação de pressa, mas o sinal de baixa confiança é registrado.

### 3. Compressão Otimizada
- **Client-side Processing:** Fotos gigantes são redimensionadas para 1600px e convertidas para JPEG progressivo com qualidade equilibrada.
- **Resiliência:** Uploads menores falham menos em redes instáveis (3G/EDGE).

### 4. Ciclo de Aprendizado (Telemetria)
- **Track de Erros:** Registramos quantas vezes o aviso de qualidade foi exibido e se o usuário escolheu ignorar ou refazer.
- **Correlação:** Agora podemos medir o impacto direto dos avisos na taxa de aprovação final da moderação.

## Resultado Esperado
- Redução de ~20% em fotos rejeitadas por "Ilegibilidade".
- Maior velocidade de aprovação em campo.
- Menos frustração para o tester que descobre a falha só depois do upload.

---
*Relatório gerado em 24 de Março de 2026. Foco em evidência forte.*
