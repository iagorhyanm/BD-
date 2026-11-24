import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarVarios, type Aviso } from "@/lib/push";
import { personalizar, proximoEnvio, type Agenda, type Recorrencia } from "@/lib/agenda";
import { formatarDataHora, hojeEmBelem } from "@/lib/datas";

type Programada = {
  id: string;
  titulo: string;
  mensagem: string;
  destino: string;
  recorrencia: string;
  data: string | null;
  hora: string;
  dias_semana: number[];
  publico: string;
  grupo_id: string | null;
  pessoas: string[];
  so_quem_nao_leu: boolean;
  proximo_envio: string | null;
};

export const agendaDe = (n: Pick<Programada, "recorrencia" | "data" | "hora" | "dias_semana">): Agenda => ({
  recorrencia: n.recorrencia as Recorrencia,
  data: n.data,
  hora: n.hora,
  diasSemana: n.dias_semana,
});

/** Quem recebe esta notificação agora (já filtrando preferências e quem tem aparelho cadastrado). */
async function destinatarios(n: Pick<Programada, "publico" | "grupo_id" | "pessoas" | "so_quem_nao_leu">, hoje: string) {
  const admin = createAdminClient();
  const { data: inscritos } = await admin.from("push_inscricoes").select("user_id");
  let ids = [...new Set((inscritos ?? []).map((i) => i.user_id))];
  if (n.publico === "grupo" && n.grupo_id) {
    const { data: m } = await admin.from("grupo_membros").select("user_id").eq("grupo_id", n.grupo_id);
    const doGrupo = new Set((m ?? []).map((x) => x.user_id));
    ids = ids.filter((id) => doGrupo.has(id));
  } else if (n.publico === "pessoas") {
    const escolhidas = new Set(n.pessoas);
    ids = ids.filter((id) => escolhidas.has(id));
  }
  if (!ids.length) return [];
  const { data: perfis } = await admin.from("profiles").select("id, nome").in("id", ids).eq("ativo", true).eq("notif_avisos", true);
  let lista = perfis ?? [];
  if (n.so_quem_nao_leu) {
    const { data: leram } = await admin.from("checkins").select("user_id").eq("data", hoje).in("user_id", lista.map((p) => p.id));
    const ja = new Set((leram ?? []).map((l) => l.user_id));
    lista = lista.filter((p) => !ja.has(p.id));
  }
  return lista;
}

/** Monta e envia o texto de cada pessoa. Devolve {destinatarios, entregues}. */
export async function dispararNotificacao(
  n: Pick<Programada, "titulo" | "mensagem" | "destino" | "publico" | "grupo_id" | "pessoas" | "so_quem_nao_leu"> & { id?: string },
  opcoes: { soPara?: string[]; tag?: string } = {},
) {
  const admin = createAdminClient();
  const hoje = hojeEmBelem();
  const pessoas = opcoes.soPara
    ? ((await admin.from("profiles").select("id, nome").in("id", opcoes.soPara)).data ?? [])
    : await destinatarios(n, hoje);
  if (!pessoas.length) return { destinatarios: 0, entregues: 0 };
  const { data: dia } = await admin.from("plano_dias").select("leitura").eq("data", hoje).maybeSingle();
  const usaSequencia = /\{sequencia\}/i.test(n.titulo + n.mensagem);
  const itens: { userId: string; aviso: Aviso }[] = [];
  for (const p of pessoas) {
    const sequencia = usaSequencia ? ((await admin.rpc("sequencia_atual", { p_user: p.id })).data ?? 0) : 0;
    const v = { nome: p.nome, leitura: dia?.leitura ?? "", sequencia };
    itens.push({
      userId: p.id,
      aviso: {
        titulo: personalizar(n.titulo, v),
        corpo: personalizar(n.mensagem, v),
        url: n.destino === "/checkin/novo" ? `/checkin/novo?dia=${hoje}` : n.destino,
        tag: opcoes.tag ?? (n.id ? `aviso-${n.id}` : "aviso"),
      },
    });
  }
  const entregues = await enviarVarios(itens, 4 * 3600);
  return { destinatarios: pessoas.length, entregues };
}

/** Envia as notificações programadas que já chegaram na hora. */
export async function enviarProgramadas(agora = new Date()) {
  const admin = createAdminClient();
  const { data: devidas } = await admin
    .from("notificacoes_programadas")
    .select("*")
    .eq("ativa", true)
    .not("proximo_envio", "is", null)
    .lte("proximo_envio", agora.toISOString())
    .order("proximo_envio")
    .limit(20);
  const resultados: { id: string; titulo: string; destinatarios: number; entregues: number; atrasada?: boolean }[] = [];
  for (const n of (devidas ?? []) as Programada[]) {
    const proximo = proximoEnvio(agendaDe(n), agora);
    // "Reserva" o envio: se outra chamada já pegou esta, a atualização não acha a linha.
    const { data: reservada } = await admin
      .from("notificacoes_programadas")
      .update({ proximo_envio: proximo?.toISOString() ?? null, ativa: proximo !== null, ultimo_envio: agora.toISOString() })
      .eq("id", n.id)
      .eq("proximo_envio", n.proximo_envio!)
      .select("id")
      .maybeSingle();
    if (!reservada) continue;
    // Se o agendador ficou fora do ar por horas, não manda um "bom dia" de madrugada.
    const atraso = agora.getTime() - new Date(n.proximo_envio!).getTime();
    if (atraso > 2 * 3600 * 1000) {
      resultados.push({ id: n.id, titulo: n.titulo, destinatarios: 0, entregues: 0, atrasada: true });
      continue;
    }
    const r = await dispararNotificacao(n);
    await admin.from("notificacoes_programadas").update({ ultimo_total: r.entregues }).eq("id", n.id);
    await admin.from("notificacoes_envios").insert({ notificacao_id: n.id, tipo: "programada", destinatarios: r.destinatarios, entregues: r.entregues });
    resultados.push({ id: n.id, titulo: n.titulo, ...r });
  }
  return resultados;
}

/** Lembrete diário para quem ainda não leu (no horário definido pelo admin). */
export async function enviarLembreteDiario(agora = new Date()) {
  const admin = createAdminClient();
  const hoje = hojeEmBelem();
  const { data: cfg } = await admin.from("app_config").select("lembrete_ativo, lembrete_hora, lembrete_ultimo").eq("id", 1).single();
  if (!cfg?.lembrete_ativo) return { motivo: "desligado" };
  if (formatarDataHora(agora, "HH:mm") < cfg.lembrete_hora.slice(0, 5)) return { motivo: "ainda não é a hora" };
  if (cfg.lembrete_ultimo === hoje) return { motivo: "já enviado hoje" };
  // Reserva o envio de hoje (evita mandar duas vezes se duas chamadas chegarem juntas).
  const { data: reservado } = await admin
    .from("app_config")
    .update({ lembrete_ultimo: hoje })
    .eq("id", 1)
    .or(`lembrete_ultimo.is.null,lembrete_ultimo.lt.${hoje}`)
    .select("id")
    .maybeSingle();
  if (!reservado) return { motivo: "já enviado hoje" };

  const { data: dia } = await admin.from("plano_dias").select("leitura").eq("data", hoje).maybeSingle();
  if (!dia) return { motivo: "sem leitura hoje" };
  const { data: inscritos } = await admin.from("push_inscricoes").select("user_id");
  const candidatos = [...new Set((inscritos ?? []).map((i) => i.user_id))];
  if (!candidatos.length) return { pendentes: 0, entregues: 0 };
  const [{ data: perfis }, { data: leram }] = await Promise.all([
    admin.from("profiles").select("id").in("id", candidatos).eq("ativo", true).eq("notif_lembrete", true),
    admin.from("checkins").select("user_id").eq("data", hoje).in("user_id", candidatos),
  ]);
  const jaLeu = new Set((leram ?? []).map((l) => l.user_id));
  const pendentes = (perfis ?? []).filter((p) => !jaLeu.has(p.id));
  const itens: { userId: string; aviso: Aviso }[] = [];
  for (const p of pendentes) {
    const s = (await admin.rpc("sequencia_atual", { p_user: p.id })).data ?? 0;
    itens.push({
      userId: p.id,
      aviso: {
        titulo: s > 0 ? `Sua sequência de ${s} ${s === 1 ? "dia" : "dias"} 🔥 está em risco!` : "Você ainda não fez a leitura de hoje 📖",
        corpo: `Hoje é ${dia.leitura}. Leia e marque antes da meia-noite${s > 0 ? " para não perder a sequência" : " e garanta 1 ponto"}.`,
        url: `/checkin/novo?dia=${hoje}`,
        tag: `lembrete-${hoje}`,
      },
    });
  }
  const entregues = await enviarVarios(itens, 5 * 3600);
  await admin.from("notificacoes_envios").insert({ tipo: "lembrete", destinatarios: pendentes.length, entregues });
  return { pendentes: pendentes.length, entregues };
}
