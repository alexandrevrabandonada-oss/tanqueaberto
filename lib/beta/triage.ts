const SCREEN_MATCHERS: Array<{ value: string; patterns: RegExp[] }> = [
  { value: "home", patterns: [/^\/$/, /\/\?/, /mapa|home|recorte/i] },
  { value: "posto", patterns: [/\/postos\/[^/]+/i] },
  { value: "envio", patterns: [/\/enviar/i] },
  { value: "auditoria", patterns: [/\/auditoria/i] },
  { value: "feedback", patterns: [/\/feedback/i] },
  { value: "beta", patterns: [/\/beta/i] }
];

export function deriveFeedbackScreen(pagePath: string, pageTitle?: string | null) {
  const value = `${pagePath} ${pageTitle ?? ""}`.trim();
  const screen = SCREEN_MATCHERS.find((item) => item.patterns.some((pattern) => pattern.test(value)));
  return screen?.value ?? "outros";
}

export function deriveFeedbackTopic(feedbackType: string, message: string, context?: string | null) {
  const haystack = `${feedbackType} ${message} ${context ?? ""}`.toLowerCase();

  if (/busca|pesquisa|filtro|filtrar/.test(haystack)) return "busca";
  if (/mapa|pin|localiza|coordenad|posto/.test(haystack)) return "mapa";
  if (/envio|foto|upload|câmera|camera|modera|moderação/.test(haystack)) return "envio";
  if (/auditoria|histórico|historico|dossi|série|serie|alerta/.test(haystack)) return "auditoria";
  if (/feedback|opini/.test(haystack)) return "feedback";
  return feedbackType;
}

export function deriveFeedbackTags(feedbackType: string, message: string, context?: string | null, pagePath?: string) {
  const haystack = `${feedbackType} ${message} ${context ?? ""} ${pagePath ?? ""}`.toLowerCase();
  const tags = new Set<string>();

  if (/(mapa|pin|localiza|coordenad)/.test(haystack)) tags.add("mapa");
  if (/(busca|filtro|filtrar)/.test(haystack)) tags.add("busca");
  if (/(envio|foto|upload|camera|câmera)/.test(haystack)) tags.add("envio");
  if (/(auditoria|histórico|historico|dossi|série|serie|alerta)/.test(haystack)) tags.add("auditoria");
  if (/(velho|recente|atualiza|preço|preco)/.test(haystack)) tags.add("recência");
  if (/(confusa|confuso|não entendi|nao entendi|travou|erro)/.test(haystack)) tags.add("fluxo");
  if (pagePath?.startsWith("/postos")) tags.add("posto");
  if (pagePath === "/enviar") tags.add("envio");
  if (pagePath === "/auditoria") tags.add("auditoria");

  return Array.from(tags).slice(0, 5);
}

export function deriveFeedbackStatus(feedbackType: string, message: string) {
  const haystack = `${feedbackType} ${message}`.toLowerCase();
  if (/(travou|erro|falha|bug|quebrou|não abre|nao abre)/.test(haystack)) return "novo";
  if (/(confusa|confuso|difícil|dificil|faltou|sugest|melhorar)/.test(haystack)) return "em_analise";
  return "novo";
}
