const STOP = new Set([
  "para", "como", "mais", "muito", "sobre", "essa", "esse", "isso", "com", "uma", "uns", "umas",
  "que", "não", "nao", "por", "dos", "das", "nos", "nas", "foi", "ser", "está", "esta", "pelo",
  "pela", "quando", "porque", "também", "tambem", "clinica", "clínica", "atendimento", "depois",
  "antes", "ainda", "apenas", "entre", "desde", "onde", "quem", "eles", "elas", "você", "voce",
  "seu", "sua", "seus", "suas", "nosso", "nossa", "tem", "ter", "são", "sao", "está", "estao",
]);

export function averageRating(ratings: number[]) {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((total, rating) => total + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export function meanResponseHours(items: Array<{ reviewedAt: string; publishedAt: string | null }>) {
  const hours = items.flatMap((item) => {
    if (!item.publishedAt) return [];
    const start = Date.parse(item.reviewedAt);
    const end = Date.parse(item.publishedAt);
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
    return [(end - start) / 3_600_000];
  });
  if (hours.length === 0) return null;
  return Math.round((hours.reduce((total, value) => total + value, 0) / hours.length) * 10) / 10;
}

export function ratingDistribution(ratings: number[]) {
  return [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: ratings.filter((value) => value === rating).length,
  }));
}

export function recurringThemes(comments: string[], minDocs = 2) {
  if (comments.filter((comment) => comment.trim()).length < 4) return [];
  const counts = new Map<string, number>();
  for (const comment of comments) {
    const seen = new Set<string>();
    const tokens = comment
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .split(/[^\p{L}]+/u)
      .filter((token) => token.length >= 5 && !STOP.has(token));
    for (const token of tokens) seen.add(token);
    for (const token of seen) counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= minDocs)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, 6)
    .map(([term, count]) => ({ term, count }));
}

export const TIME_SAVED_MINUTES = {
  publishedReply: 6,
  deliveredMessage: 3,
} as const;

export function estimateMinutesSaved(publishedConfirmed: number, deliveredConfirmed: number) {
  return publishedConfirmed * TIME_SAVED_MINUTES.publishedReply + deliveredConfirmed * TIME_SAVED_MINUTES.deliveredMessage;
}

export const TIME_SAVED_METHOD =
  "Estimativa: 6 minutos por resposta com publicação confirmada pelo provedor e 3 minutos por mensagem com entrega confirmada por webhook. Não entra rascunho, aprovação, envio apenas aceito nem avaliação recebida. Não é medição do tempo real da equipe.";
