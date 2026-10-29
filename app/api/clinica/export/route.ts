import { NextResponse } from "next/server";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/guard";
import { exportClinic } from "@/lib/ops/dashboard";

export async function GET() {
  const actor = await requireUser();
  if (!can(actor.role, "export_data")) {
    return NextResponse.json({ error: "Seu perfil não pode exportar os dados." }, { status: 403 });
  }
  const payload = exportClinic(actor.clinicId);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": "attachment; filename=vetagents-clinica.json",
      "Cache-Control": "no-store",
    },
  });
}
