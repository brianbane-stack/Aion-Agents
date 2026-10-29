import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { externalCallsAllowed } from "@/lib/env";
import { sealJson } from "@/lib/auth/token";

export async function GET(request: Request) {
  const actor = await requireUser();
  const url = new URL(request.url);
  const back = new URL("/integracoes/google_business", url.origin);
  if (!can(actor.role, "manage_integrations")) {
    back.searchParams.set("aviso", "Seu perfil não pode conectar integrações.");
    return NextResponse.redirect(back);
  }
  if (!externalCallsAllowed() || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    back.searchParams.set("aviso", "Google não configurado. Nenhum redirecionamento de autorização foi feito.");
    return NextResponse.redirect(back);
  }
  const redirectUri = `${url.origin}/api/integrations/google/callback`;
  const state = sealJson({ userId: actor.userId, clinicId: actor.clinicId, origin: url.origin, exp: Date.now() + 10 * 60 * 1000 });
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("access_type", "offline");
  auth.searchParams.set("prompt", "consent");
  auth.searchParams.set("scope", "https://www.googleapis.com/auth/business.manage");
  auth.searchParams.set("state", state);
  return NextResponse.redirect(auth);
}
