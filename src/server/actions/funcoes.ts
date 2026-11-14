"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireEdg, type Resultado } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(60),
  tipo: z.enum(["voz", "instrumento", "outro"]),
});

function revalidar() {
  revalidatePath("/admin/funcoes");
  revalidatePath("/membros", "layout");
}

export async function criarFuncao(formData: FormData): Promise<Resultado> {
  await requireEdg();
  const p = schema.safeParse(Object.fromEntries(formData));
  if (!p.success) return falha(p.error.issues[0].message);
  const supabase = await createClient();
  const { data: ultima } = await supabase.from("funcoes").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from("funcoes").insert({ ...p.data, ordem: (ultima?.ordem ?? 0) + 1 });
  if (error) return falha(error.code === "23505" ? "Já existe uma função com esse nome." : "Não foi possível criar.");
  revalidar();
  return { ok: true };
}

export async function editarFuncao(id: string, formData: FormData): Promise<Resultado> {
  await requireEdg();
  const p = schema.safeParse(Object.fromEntries(formData));
  if (!p.success) return falha(p.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.from("funcoes").update(p.data).eq("id", id);
  if (error) return falha(error.code === "23505" ? "Já existe uma função com esse nome." : "Não foi possível salvar.");
  revalidar();
  return { ok: true };
}

export async function alternarFuncao(id: string, ativo: boolean): Promise<Resultado> {
  await requireEdg();
  const supabase = await createClient();
  const { error } = await supabase.from("funcoes").update({ ativo }).eq("id", id);
  if (error) return falha("Não foi possível alterar.");
  revalidar();
  return { ok: true };
}

export async function excluirFuncao(id: string): Promise<Resultado> {
  await requireEdg();
  const supabase = await createClient();
  const { error } = await supabase.from("funcoes").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return falha("Essa função já foi usada em escalas. Desative em vez de excluir.");
    return falha("Não foi possível excluir.");
  }
  revalidar();
  return { ok: true };
}
