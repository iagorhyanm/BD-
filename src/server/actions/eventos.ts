"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireStaff, type Resultado } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import { deBelem } from "@/lib/datas";

const eventoSchema = z
  .object({
    tipo: z.enum(["ensaio", "apresentacao"], { message: "Escolha o tipo." }),
    titulo: z.string().trim().min(2, "Informe o título.").max(120),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
    hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário de início."),
    hora_fim: z.string().optional(),
    local: z.string().trim().max(200).optional(),
    pauta: z.string().trim().max(5000).optional(),
  })
  .refine((d) => !d.hora_fim || d.hora_fim > d.hora_inicio, {
    message: "O término precisa ser depois do início.",
  });

function revalidar(id?: string) {
  revalidatePath("/agenda");
  revalidatePath("/presenca");
  revalidatePath("/");
  if (id) revalidatePath(`/agenda/${id}`);
}

export async function salvarEvento(id: string | null, formData: FormData): Promise<Resultado<{ id: string }>> {
  const eu = await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) return falha("Crie uma edição primeiro.");
  const p = eventoSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return falha(p.error.issues[0].message);
  const d = p.data;

  const linha = {
    tipo: d.tipo,
    titulo: d.titulo,
    inicio: deBelem(d.data, d.hora_inicio).toISOString(),
    fim: d.hora_fim ? deBelem(d.data, d.hora_fim).toISOString() : null,
    local: d.local || null,
    pauta: d.pauta || null,
  };

  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("eventos").update(linha).eq("id", id);
    if (error) return falha("Não foi possível salvar.");
    revalidar(id);
    return { ok: true, dados: { id } };
  }
  const { data, error } = await supabase
    .from("eventos")
    .insert({ ...linha, edicao_id: edicao.id, criado_por: eu.id })
    .select("id")
    .single();
  if (error) return falha("Não foi possível criar o evento.");
  revalidar(data.id);
  return { ok: true, dados: { id: data.id } };
}

export async function excluirEvento(id: string): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("eventos").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir.");
  revalidar();
  return { ok: true };
}

export async function adicionarEscala(eventoId: string, membroId: string, funcaoId: string): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("escalas")
    .insert({ evento_id: eventoId, membro_id: membroId, funcao_id: funcaoId });
  if (error) {
    if (error.code === "23505") return falha("Essa pessoa já está escalada nessa função.");
    return falha("Não foi possível escalar.");
  }
  revalidar(eventoId);
  return { ok: true };
}

export async function removerEscala(id: string, eventoId: string): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("escalas").delete().eq("id", id);
  if (error) return falha("Não foi possível remover.");
  revalidar(eventoId);
  return { ok: true };
}

/** Copia a escala de outro evento (ex.: repetir a escala do último ensaio). */
export async function copiarEscala(eventoId: string, origemId: string): Promise<Resultado<{ copiados: number }>> {
  await requireStaff();
  const supabase = await createClient();
  const { data: origem } = await supabase.from("escalas").select("membro_id, funcao_id").eq("evento_id", origemId);
  if (!origem?.length) return falha("O evento de origem não tem escala.");
  const { data, error } = await supabase
    .from("escalas")
    .upsert(
      origem.map((e) => ({ ...e, evento_id: eventoId })),
      { onConflict: "evento_id,membro_id,funcao_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) return falha("Não foi possível copiar a escala.");
  revalidar(eventoId);
  return { ok: true, dados: { copiados: data?.length ?? 0 } };
}
