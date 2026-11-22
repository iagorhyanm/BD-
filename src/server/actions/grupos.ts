"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireUsuario, type Resultado } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const grupoSchema = z
  .object({
    nome: z.string().trim().min(2, "Dê um nome ao desafio.").max(80),
    descricao: z.string().trim().max(1000).optional(),
    inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de início."),
    fim: z
      .string()
      .optional()
      .transform((v) => v || null)
      .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data de término inválida."),
  })
  .refine((d) => !d.fim || d.fim >= d.inicio, { message: "O término precisa ser depois do início." });

function revalidar(id?: string) {
  revalidatePath("/grupos");
  revalidatePath("/");
  if (id) revalidatePath(`/grupos/${id}`);
}

export async function salvarGrupo(id: string | null, formData: FormData): Promise<Resultado<{ id: string }>> {
  const eu = await requireUsuario();
  const p = grupoSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return falha(p.error.issues[0].message);
  const linha = { nome: p.data.nome, descricao: p.data.descricao || null, inicio: p.data.inicio, fim: p.data.fim };
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("grupos").update(linha).eq("id", id);
    if (error) return falha("Não foi possível salvar.");
    revalidar(id);
    return { ok: true, dados: { id } };
  }
  const { data, error } = await supabase.from("grupos").insert({ ...linha, criado_por: eu.id }).select("id").single();
  if (error) return falha("Não foi possível criar o desafio.");
  revalidar(data.id);
  return { ok: true, dados: { id: data.id } };
}

export async function excluirGrupo(id: string): Promise<Resultado> {
  await requireUsuario();
  const supabase = await createClient();
  const { error, count } = await supabase.from("grupos").delete({ count: "exact" }).eq("id", id);
  if (error || !count) return falha("Só o dono pode excluir o desafio.");
  revalidar();
  return { ok: true };
}

export async function entrarNoGrupo(codigo: string): Promise<Resultado<{ id: string }>> {
  await requireUsuario();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("entrar_no_grupo", { p_codigo: codigo });
  if (error || !data) {
    if (error?.message.includes("CODIGO_INVALIDO")) return falha("Código de convite não encontrado.");
    if (error?.message.includes("DESAFIO_ENCERRADO")) return falha("Esse desafio já terminou.");
    return falha("Não foi possível entrar no desafio.");
  }
  revalidar(data);
  return { ok: true, dados: { id: data } };
}

export async function sairDoGrupo(grupoId: string): Promise<Resultado> {
  const eu = await requireUsuario();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("grupo_membros")
    .delete({ count: "exact" })
    .eq("grupo_id", grupoId)
    .eq("user_id", eu.id);
  if (error || !count) return falha("O dono não pode sair. Exclua o desafio ou passe a dona(o) para outra pessoa.");
  revalidar(grupoId);
  return { ok: true };
}

export async function removerMembro(grupoId: string, userId: string): Promise<Resultado> {
  await requireUsuario();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("grupo_membros")
    .delete({ count: "exact" })
    .eq("grupo_id", grupoId)
    .eq("user_id", userId);
  if (error || !count) return falha("Sem permissão para remover essa pessoa.");
  revalidar(grupoId);
  return { ok: true };
}

export async function definirPapelNoGrupo(grupoId: string, userId: string, papel: "admin" | "membro"): Promise<Resultado> {
  await requireUsuario();
  if (papel !== "admin" && papel !== "membro") return falha("Papel inválido.");
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("grupo_membros")
    .update({ papel }, { count: "exact" })
    .eq("grupo_id", grupoId)
    .eq("user_id", userId);
  if (error || !count) return falha("Só o dono do desafio pode mudar papéis.");
  revalidar(grupoId);
  return { ok: true };
}
