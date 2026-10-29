export function formatDateTime(iso: string, timeZone = "America/Sao_Paulo") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

export function formatLongDate(iso: string, timeZone = "America/Sao_Paulo") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function nowIso() {
  return new Date().toISOString();
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return "número oculto";
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ****-${digits.slice(-4)}`;
}

export function displayPhone(phone: string, canSeeFull: boolean) {
  return canSeeFull ? phone : maskPhone(phone);
}

export function excerpt(value: string, max = 140) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function readStringArray(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function sanitizeProviderError(input: string) {
  return input
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [redigido]")
    .replace(/EAA[A-Za-z0-9]+/g, "[token]")
    .replace(/sk-[A-Za-z0-9]+/g, "[token]")
    .slice(0, 300);
}

export function likeTerm(value: string) {
  return `%${value.replace(/[%_]/g, "").slice(0, 80)}%`;
}
