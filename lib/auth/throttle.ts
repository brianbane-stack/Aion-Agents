const attempts = new Map<string, { count: number; reset: number }>();

export function isLimited(key: string) {
  const current = attempts.get(key);
  return Boolean(current && current.reset > Date.now() && current.count >= 8);
}

export function registerFailure(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.reset < now) {
    attempts.set(key, { count: 1, reset: now + 10 * 60 * 1000 });
    return;
  }
  current.count += 1;
}

export function clearFailures(key: string) {
  attempts.delete(key);
}
