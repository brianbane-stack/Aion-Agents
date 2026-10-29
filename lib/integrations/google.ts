import { sanitizeProviderError } from "@/lib/format";

export type GoogleReview = {
  reviewId: string;
  name: string;
  authorName: string;
  rating: number;
  comment: string;
  createTime: string;
  replyComment?: string;
  replyUpdateTime?: string;
};

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

type FetchResult = { ok: true; json: unknown } | { ok: false; message: string };

async function googleFetch(url: string, accessToken: string, init: RequestInit, fetchImpl: typeof fetch): Promise<FetchResult> {
  try {
    const response = await fetchImpl(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(20_000),
    });
    const text = await response.text();
    if (!response.ok) {
      let message = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(text) as { error?: { message?: string } };
        if (parsed.error?.message) message = parsed.error.message;
      } catch {
        if (text) message = text.slice(0, 180);
      }
      return { ok: false, message: sanitizeProviderError(message) };
    }
    return { ok: true, json: text ? JSON.parse(text) : {} };
  } catch {
    return { ok: false, message: "Não foi possível contatar o Google." };
  }
}

export async function exchangeGoogleCode(input: { code: string; redirectUri: string; fetchImpl?: typeof fetch }) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { ok: false as const, message: "Credenciais OAuth do Google ausentes." };
  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  });
  try {
    const response = await (input.fetchImpl ?? fetch)("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await response.json()) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };
    if (!response.ok || !json.access_token) {
      return { ok: false as const, message: sanitizeProviderError(json.error || "O Google não entregou um token.") };
    }
    return {
      ok: true as const,
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
    };
  } catch {
    return { ok: false as const, message: "Não foi possível contatar o Google." };
  }
}

export async function refreshGoogleToken(refreshToken: string, fetchImpl: typeof fetch = fetch) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { ok: false as const, message: "Credenciais OAuth do Google ausentes." };
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  try {
    const response = await fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await response.json()) as { access_token?: string; expires_in?: number };
    if (!response.ok || !json.access_token) return { ok: false as const, message: "Não foi possível renovar o acesso ao Google." };
    return {
      ok: true as const,
      accessToken: json.access_token,
      expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
    };
  } catch {
    return { ok: false as const, message: "Não foi possível contatar o Google." };
  }
}

export async function listGoogleAccounts(accessToken: string, fetchImpl: typeof fetch = fetch) {
  const result = await googleFetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", accessToken, { method: "GET" }, fetchImpl);
  if (!result.ok) return result;
  const json = result.json as { accounts?: Array<{ name?: string; accountName?: string }> };
  const accounts = (json.accounts ?? []).flatMap((account) => (account.name ? [{ name: account.name, title: account.accountName || account.name }] : []));
  return { ok: true as const, accounts };
}

export async function listGoogleLocations(accessToken: string, accountName: string, fetchImpl: typeof fetch = fetch) {
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title&pageSize=100`;
  const result = await googleFetch(url, accessToken, { method: "GET" }, fetchImpl);
  if (!result.ok) return result;
  const json = result.json as { locations?: Array<{ name?: string; title?: string }> };
  const locations = (json.locations ?? []).flatMap((location) => {
    if (!location.name) return [];
    const locationId = location.name.startsWith("locations/") ? location.name.slice("locations/".length) : location.name;
    return [{ resource: `${accountName}/locations/${locationId}`, title: location.title || location.name }];
  });
  return { ok: true as const, locations };
}

export async function listAllGoogleReviews(accessToken: string, parent: string, fetchImpl: typeof fetch = fetch) {
  const reviews: GoogleReview[] = [];
  let pageToken = "";
  for (let page = 0; page < 20; page += 1) {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${parent}/reviews`);
    url.searchParams.set("pageSize", "50");
    url.searchParams.set("orderBy", "updateTime desc");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const result = await googleFetch(url.toString(), accessToken, { method: "GET" }, fetchImpl);
    if (!result.ok) return result;
    const json = result.json as {
      reviews?: Array<{
        name?: string;
        reviewId?: string;
        reviewer?: { displayName?: string };
        starRating?: string;
        comment?: string;
        createTime?: string;
        reviewReply?: { comment?: string; updateTime?: string };
      }>;
      nextPageToken?: string;
    };
    for (const review of json.reviews ?? []) {
      const reviewId = review.reviewId || review.name?.split("/").pop();
      if (!reviewId || !review.name) continue;
      reviews.push({
        reviewId,
        name: review.name,
        authorName: review.reviewer?.displayName || "Tutor sem nome público",
        rating: STARS[review.starRating || ""] || 0,
        comment: review.comment || "",
        createTime: review.createTime || new Date().toISOString(),
        replyComment: review.reviewReply?.comment,
        replyUpdateTime: review.reviewReply?.updateTime,
      });
    }
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }
  return { ok: true as const, reviews: reviews.filter((review) => review.rating >= 1) };
}

export async function putReviewReply(input: { accessToken: string; reviewName: string; comment: string; fetchImpl?: typeof fetch }) {
  const result = await googleFetch(
    `https://mybusiness.googleapis.com/v4/${input.reviewName}/reply`,
    input.accessToken,
    { method: "PUT", body: JSON.stringify({ comment: input.comment }) },
    input.fetchImpl ?? fetch,
  );
  if (!result.ok) return result;
  const json = result.json as { updateTime?: string };
  return { ok: true as const, updateTime: json.updateTime || new Date().toISOString() };
}
