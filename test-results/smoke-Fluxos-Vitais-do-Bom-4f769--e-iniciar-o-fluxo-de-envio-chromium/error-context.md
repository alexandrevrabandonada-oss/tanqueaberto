# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e4]:
    - generic [ref=e5]:
      - paragraph [ref=e6]: Erro temporário
      - heading "Algo saiu do esperado." [level=1] [ref=e7]
      - paragraph [ref=e8]: Tente recarregar a tela. Se o problema continuar, volte para o mapa ou envie feedback.
    - generic [ref=e9]:
      - button "Tentar de novo" [ref=e10]
      - link "Enviar feedback" [ref=e11] [cursor=pointer]:
        - /url: /feedback
```