"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireEdg, type Resultado } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const numero = (msg: string) =>
  z.coerce.number({ message: msg }).int(msg).min(0, msg);

const edicaoSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome da edição (ex.: EJC 2027)."),
  ano: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 2000 && v <= 2100), "Ano inválido."),
  vagas_masculino: numero("Vagas masculinas inválidas."),
  vagas_feminino: numero("Vagas femininas inválidas."),
  limite_faltas: numero("Limite de faltas inválido."),
  texto_lgpd: z.string().trim().min(20, "O texto de consentimento LGPD está muito curto."),
});

const duplicarSchema = z.object({
  nome: edicaoSchema.shape.nome,
  ano: edicaoSchema.shape.ano,
});

function revalidar() {
  revalidatePath("/", "layout");
}

export async function criarEdicao(formData: FormData): Promise<Resultado<{ id: string }>> {
  const eu = await requireEdg();
  const parsed = edicaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falha(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { count } = await supabase.from("edicoes").select("id", { count: "exact", head: true });
  const { data, error } = await supabase
    .from("edicoes")
    .insert({ ...parsed.data, criado_por: eu.id, ativa: (count ?? 0) === 0 })
    .select("id")
    .single();
  if (error) return falha("Não foi possível criar a edição.");
  revalidar();
  return { ok: true, dados: { id: data.id } };
}

export async function editarEdicao(id: string, formData: FormData): Promise<Resultado> {
  await requireEdg();
  const parsed = edicaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falha(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.from("edicoes").update(parsed.data).eq("id", id);
  if (error) return falha("Não foi possível salvar a edição.");
  revalidar();
  return { ok: true };
}

export async function ativarEdicao(id: string): Promise<Resultado> {
  await requireEdg();
  const supabase = await createClient();
  const { error } = await supabase.rpc("ativar_edicao", { p_id: id });
  if (error) return falha("Não foi possível ativar a edição.");
  revalidar();
  return { ok: true };
}

export async function duplicarEdicao(origemId: string, formData: FormData): Promise<Resultado<{ id: string }>> {
  await requireEdg();
  const parsed = duplicarSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falha(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duplicar_edicao", {
    p_origem: origemId,
    p_nome: parsed.data.nome,
    p_ano: parsed.data.ano as number,
  });
  if (error || !data) return falha("Não foi possível duplicar a edição.");
  revalidar();
  return { ok: true, dados: { id: data } };
}

export async function excluirEdicao(id: string): Promise<Resultado> {
  await requireEdg();
  const supabase = await createClient();
  const { data: edicao } = await supabase.from("edicoes").select("ativa").eq("id", id).maybeSingle();
  if (!edicao) return falha("Edição não encontrada.");
  if (edicao.ativa) return falha("Ative outra edição antes de excluir esta.");

  const { error } = await supabase.from("edicoes").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return falha("Esta edição tem dados vinculados e não pode ser excluída.");
    return falha("Não foi possível excluir a edição.");
  }
  revalidar();
  return { ok: true };
}
