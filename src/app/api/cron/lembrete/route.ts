import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPara, pushConfigurado } from "@/lib/push";
import { hojeEmBelem } from "@/lib/datas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Lembrete diário (Vercel Cron, ~18h em Belém): avisa quem tem
 * notificações ligadas e ainda não marcou a leitura de hoje.
 */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!pushConfigurado()) return NextResponse.json({ erro: "push não configurado" }, { status: 500 });

  const admin = createAdminClient();
  const hoje = hojeEmBelem();
  const { data: dia } = await admin.from("plano_dias").select("leitura").eq("data", hoje).maybeSingle();
  if (!dia) return NextResponse.json({ ok: true, enviados: 0, motivo: "sem leitura hoje" });

  const { data: inscritos } = await admin.from("push_inscricoes").select("user_id");
  const candidatos = [...new Set((inscritos ?? []).map((i) => i.user_id))];
  if (!candidatos.length) return NextResponse.json({ ok: true, enviados: 0 });

  const [{ data: perfis }, { data: leram }] = await Promise.all([
    admin.from("profiles").select("id, nome").in("id", candidatos).eq("ativo", true).eq("notif_lembrete", true),
    admin.from("checkins").select("user_id").eq("data", hoje).in("user_id", candidatos),
  ]);
  const jaLeu = new Set((leram ?? []).map((l) => l.user_id));
  const pendentes = (perfis ?? []).filter((p) => !jaLeu.has(p.id));

  let enviados = 0;
  for (const p of pendentes) {
    const { data: seq } = await admin.rpc("sequencia_atual", { p_user: p.id });
    const s = seq ?? 0;
    enviados += await enviarPara(
      [p.id],
      {
        titulo: s > 0 ? `Sua sequência de ${s} ${s === 1 ? "dia" : "dias"} 🔥 está em risco!` : "Você ainda não fez a leitura de hoje 📖",
        corpo: `Hoje é ${dia.leitura}. Leia e marque antes da meia-noite${s > 0 ? " para não perder a sequência" : " e garanta 1 ponto"}.`,
        url: `/checkin/novo?dia=${hoje}`,
        tag: `lembrete-${hoje}`,
      },
      5 * 3600,
    );
  }
  return NextResponse.json({ ok: true, pendentes: pendentes.length, enviados });
}
