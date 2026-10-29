const BANNED = [
  "desconto",
  "brinde",
  "recompensa",
  "cupom",
  "avaliação positiva",
  "avaliacao positiva",
  "5 estrelas",
  "cinco estrelas",
  "se gostou",
  "somente quem",
  "excluir quem",
];

export function neutralReviewIssue(body: string) {
  const normalized = body.toLocaleLowerCase("pt-BR");
  const hit = BANNED.find((term) => normalized.includes(term));
  if (!hit) return null;
  return `O convite de avaliação precisa ser neutro. Remova “${hit}”.`;
}

export function renderTemplate(body: string, firstName: string) {
  return body.replaceAll("{{1}}", firstName || "olá");
}
