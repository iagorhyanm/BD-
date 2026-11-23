import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export type Aviso = {
  titulo: string;
  corpo: string;
  /** Página aberta ao tocar na notificação. */
  url: string;
  /** Notificações com a mesma tag se substituem (não empilham). */
  tag?: string;
};

let configurado = false;
export function pushConfigurado() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configurado) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://biblerats-app.vercel.app", pub, priv);
    configurado = true;
  }
  return true;
}

const limitar = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Envia para todos os aparelhos dessas pessoas. Devolve quantas entregas deram certo. */
export async function enviarPara(userIds: string[], aviso: Aviso, ttlSegundos = 6 * 3600): Promise<number> {
  if (!userIds.length || !pushConfigurado()) return 0;
  const admin = createAdminClient();
  const { data: inscricoes } = await admin.from("push_inscricoes").select("id, endpoint, p256dh, auth").in("user_id", userIds);
  if (!inscricoes?.length) return 0;
  const payload = JSON.stringify({ ...aviso, titulo: limitar(aviso.titulo, 80), corpo: limitar(aviso.corpo, 180) });
  const mortas: string[] = [];
  const r = await Promise.allSettled(
    inscricoes.map((i) =>
      webpush
        .sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, payload, { TTL: ttlSegundos, urgency: "normal" })
        .catch((e: { statusCode?: number }) => {
          // Aparelho desinstalou o app ou revogou a permissão: remove a inscrição.
          if (e.statusCode === 404 || e.statusCode === 410) mortas.push(i.id);
          throw e;
        }),
    ),
  );
  if (mortas.length) await admin.from("push_inscricoes").delete().in("id", mortas);
  return r.filter((x) => x.status === "fulfilled").length;
}

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0];

/** Avisa os colegas de desafio que alguém marcou uma leitura. */
export async function notificarCheckin(checkinId: string) {
  if (!pushConfigurado()) return;
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("checkins")
    .select("id, user_id, no_prazo, anotacao, profiles!checkins_user_id_fkey(nome), plano_dias(leitura)")
    .eq("id", checkinId)
    .maybeSingle();
  if (!c) return;
  const { data: grupos } = await admin.from("grupo_membros").select("grupo_id").eq("user_id", c.user_id);
  if (!grupos?.length) return;
  const { data: colegas } = await admin
    .from("grupo_membros")
    .select("user_id, profiles!inner(ativo, notif_checkins)")
    .in("grupo_id", grupos.map((g) => g.grupo_id))
    .neq("user_id", c.user_id)
    .eq("profiles.ativo", true)
    .eq("profiles.notif_checkins", true);
  const ids = [...new Set((colegas ?? []).map((x) => x.user_id))];
  const nome = primeiroNome((c.profiles as { nome: string } | null)?.nome ?? "Alguém");
  const leitura = (c.plano_dias as { leitura: string } | null)?.leitura ?? "";
  await enviarPara(ids, {
    titulo: c.no_prazo ? `${nome} fez a leitura de hoje 🔥` : `${nome} recuperou uma leitura 📖`,
    corpo: [leitura, c.anotacao].filter(Boolean).join(" · "),
    url: `/checkin/${c.id}`,
    tag: `checkin-${c.id}`,
  });
}

/** Avisa o dono da leitura que alguém comentou. */
export async function notificarComentario(checkinId: string, autorId: string, texto: string) {
  if (!pushConfigurado()) return;
  const admin = createAdminClient();
  const { data: c } = await admin
    .from("checkins")
    .select("user_id, profiles!checkins_user_id_fkey(ativo, notif_comentarios)")
    .eq("id", checkinId)
    .maybeSingle();
  const dono = c?.profiles as { ativo: boolean; notif_comentarios: boolean } | null;
  if (!c || c.user_id === autorId || !dono?.ativo || !dono.notif_comentarios) return;
  const { data: autor } = await admin.from("profiles").select("nome").eq("id", autorId).maybeSingle();
  await enviarPara([c.user_id], {
    titulo: `${primeiroNome(autor?.nome ?? "Alguém")} comentou na sua leitura 💬`,
    corpo: texto,
    url: `/checkin/${checkinId}`,
    tag: `comentarios-${checkinId}`,
  });
}

/** Avisa quem foi colocado num desafio pelo administrador. */
export async function notificarAdicionados(userIds: string[], grupo: { id: string; nome: string }, quem: string) {
  if (!pushConfigurado() || !userIds.length) return;
  await enviarPara(userIds, {
    titulo: `Você entrou no desafio ${grupo.nome} 🏆`,
    corpo: `${primeiroNome(quem)} te adicionou. Bora ler junto!`,
    url: `/grupos/${grupo.id}`,
    tag: `grupo-${grupo.id}`,
  });
}
