import { NextResponse } from "next/server";
import { openJson } from "@/lib/auth/token";
import { requireUser } from "@/lib/auth/guard";
import { exchangeGoogleCode } from "@/lib/integrations/google";
import { storeGoogleTokens } from "@/lib/integrations/service";

export async function GET(request: Request) {
  const actor = await requireUser();
  const url = new URL(request.url);
  const back = (message: string) => NextResponse.redirect(new URL(`/integracoes/google_business?aviso=${encodeURIComponent(message)}`, url.origin));
  const state = openJson<{ userId: string; clinicId: string; origin: string; exp: number }>(url.searchParams.get("state"));
  if (!state || state.exp < Date.now() || state.userId !== actor.userId || state.clinicId !== actor.clinicId) {
    return back("A autorização do Google expirou ou não corresponde a esta sessão. Nada foi salvo.");
  }
  const code = url.searchParams.get("code");
  if (!code) return back(url.searchParams.get("error") || "O Google não devolveu um código. Nada foi salvo.");
  const redirectUri = `${state.origin}/api/integrations/google/callback`;
  const tokens = await exchangeGoogleCode({ code, redirectUri });
  if (!tokens.ok) return back(tokens.message);
  await storeGoogleTokens(actor.clinicId, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  }, null);
  return back("Acesso do Google armazenado. Escolha o local e sincronize as avaliações. Isso ainda não publica respostas.");
}
