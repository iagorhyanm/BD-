"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireAdmin, type Resultado } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { registrarLogAdmin } from "@/lib/logs";
import { pushConfigurado } from "@/lib/push";
import { proximoEnvio } from "@/lib/agenda";
import { agendaDe, dispararNotificacao } from "@/lib/notificacoes-envio";

const ROTA = "/admin/notificacoes";
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z
  .object({
    titulo: z.string().trim().min(1, "Escreva o título.").max(80, "Título com até 80 caracteres."),
    mensagem: z.string().trim().min(1, "Escreva a mensagem.").max(300, "Mensagem com até 300 caracteres."),
    destino: z.enum(["/", "/checkin/novo", "/plano", "/grupos"]),
    recorrencia: z.enum(["uma_vez", "diaria", "semanal"]),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    hora: z.string().regex(HORA, "Escolha a hora."),
    dias_semana: z.array(z.number().int().min(0).max(6)).max(7),
    publico: z.enum(["todos", "grupo", "pessoas"]),
    grupo_id: z.string().uuid().nullable(),
    pessoas: z.array(z.string().uuid()).max(1000),
    so_quem_nao_leu: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (d.recorrencia === "uma_vez" && !d.data) ctx.addIssue({ code: "custom", message: "Escolha a data." });
    if (d.recorrencia === "semanal" && d.dias_semana.length === 0) ctx.addIssue({ code: "custom", message: "Escolha pelo menos um dia da semana." });
    if (d.publico === "grupo" && !d.grupo_id) ctx.addIssue({ code: "custom", message: "Escolha o desafio." });
    if (d.publico === "pessoas" && d.pessoas.length === 0) ctx.addIssue({ code: "custom", message: "Escolha pelo menos uma pessoa." });
  });

export type DadosNotificacao = z.infer<typeof schema>;

function normalizar(d: DadosNotificacao) {
  return {
    ...d,
    data: d.recorrencia === "uma_vez" ? d.data : null,
    dias_semana: d.recorrencia === "semanal" ? [...new Set(d.dias_semana)].sort() : [],
    grupo_id: d.publico === "grupo" ? d.grupo_id : null,
    pessoas: d.publico === "pessoas" ? [...new Set(d.pessoas)] : [],
  };
}

export async function salvarNotificacao(id: string | null, dados: DadosNotificacao): Promise<Resultado<{ id: string }>> {
  const ator = await requireAdmin();
  const p = schema.safeParse(dados);
  if (!p.success) return falha(p.error.issues[0].message);
  const linha = normalizar(p.data);
  const proximo = proximoEnvio(agendaDe(linha));
  if (!proximo) return falha("Esse dia e horário já passaram. Escolha um momento no futuro.");
  const supabase = await createClient();
  const registro = { ...linha, ativa: true, proximo_envio: proximo.toISOString() };
  const r = id
    ? await supabase.from("notificacoes_programadas").update(registro).eq("id", id).select("id").single()
    : await supabase.from("notificacoes_programadas").insert(registro).select("id").single();
  if (r.error || !r.data) return falha("Não foi possível salvar.");
  await registrarLogAdmin({ ator, acao: id ? "editou a notificação" : "programou a notificação", entidade: "notificacoes_programadas", entidadeId: r.data.id, descricao: linha.titulo });
  revalidatePath(ROTA);
  return { ok: true, dados: { id: r.data.id } };
}

export async function alternarNotificacao(id: string, ativa: boolean): Promise<Resultado> {
  await requireAdmin();
  const supabase = await createClient();
  const { data: n } = await supabase.from("notificacoes_programadas").select("recorrencia, data, hora, dias_semana").eq("id", id).maybeSingle();
  if (!n) return falha("Notificação não encontrada.");
  const proximo = ativa ? proximoEnvio(agendaDe(n)) : null;
  if (ativa && !proximo) return falha("O horário dessa notificação já passou. Edite para escolher outro.");
  const { error } = await supabase
    .from("notificacoes_programadas")
    .update({ ativa, proximo_envio: proximo?.toISOString() ?? null })
    .eq("id", id);
  if (error) return falha("Não foi possível alterar.");
  revalidatePath(ROTA);
  return { ok: true };
}

export async function excluirNotificacao(id: string): Promise<Resultado> {
  const ator = await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase.from("notificacoes_programadas").delete().eq("id", id).select("titulo").maybeSingle();
  if (error || !data) return falha("Não foi possível excluir.");
  await registrarLogAdmin({ ator, acao: "excluiu a notificação", entidade: "notificacoes_programadas", entidadeId: id, descricao: data.titulo });
  revalidatePath(ROTA);
  return { ok: true };
}

/** Manda só para o próprio admin, para ver como fica. */
export async function testarNotificacao(dados: Pick<DadosNotificacao, "titulo" | "mensagem" | "destino">): Promise<Resultado<{ entregues: number }>> {
  const ator = await requireAdmin();
  if (!pushConfigurado()) return falha("As notificações não estão configuradas no servidor.");
  if (!dados.titulo?.trim() || !dados.mensagem?.trim()) return falha("Escreva o título e a mensagem.");
  const r = await dispararNotificacao(
    {
      titulo: dados.titulo.slice(0, 80),
      mensagem: dados.mensagem.slice(0, 300),
      destino: ["/", "/checkin/novo", "/plano", "/grupos"].includes(dados.destino) ? dados.destino : "/",
      publico: "pessoas",
      grupo_id: null,
      pessoas: [ator.id],
      so_quem_nao_leu: false,
    },
    { soPara: [ator.id], tag: "teste-admin" },
  );
  if (!r.entregues) return falha("Não chegou em nenhum aparelho seu. Ative as notificações no seu Perfil primeiro.");
  return { ok: true, dados: { entregues: r.entregues } };
}

export async function salvarLembrete(ativo: boolean, hora: string): Promise<Resultado> {
  await requireAdmin();
  if (!HORA.test(hora)) return falha("Escolha a hora.");
  const supabase = await createClient();
  const { error } = await supabase.from("app_config").update({ lembrete_ativo: ativo, lembrete_hora: hora }).eq("id", 1);
  if (error) return falha("Não foi possível salvar.");
  revalidatePath(ROTA);
  return { ok: true };
}
