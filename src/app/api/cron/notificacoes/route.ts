import { NextResponse } from "next/server";
import { pushConfigurado } from "@/lib/push";
import { enviarLembreteDiario, enviarProgramadas } from "@/lib/notificacoes-envio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Chamada a cada 5 minutos pelo agendador do Supabase (pg_cron + pg_net).
 * Envia as notificações programadas que chegaram na hora e, no horário
 * configurado, o lembrete diário para quem ainda não leu.
 */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!pushConfigurado()) return NextResponse.json({ erro: "push não configurado" }, { status: 500 });
  const agora = new Date();
  const [programadas, lembrete] = await Promise.all([enviarProgramadas(agora), enviarLembreteDiario(agora)]);
  return NextResponse.json({ ok: true, programadas, lembrete });
}
