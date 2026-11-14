"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireStaff, type Resultado } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";

const avisoSchema = z.object({
  titulo: z.string().trim().min(2, "Informe o título.").max(150),
  texto: z.string().trim().min(2, "Escreva o aviso.").max(4000),
  fixado: z.string().optional(),
});

function revalidar(id?: string) {
  revalidatePath("/avisos");
  revalidatePath("/");
  if (id) revalidatePath(`/avisos/${id}`);
}

export async function salvarAviso(id: string | null, formData: FormData): Promise<Resultado<{ id: string }>> {
  const eu = await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) return falha("Crie uma edição primeiro.");
  const p = avisoSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return falha(p.error.issues[0].message);
  const linha = { titulo: p.data.titulo, texto: p.data.texto, fixado: p.data.fixado === "on" };
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("avisos").update(linha).eq("id", id);
    if (error) return falha("Não foi possível salvar.");
    revalidar(id);
    return { ok: true, dados: { id } };
  }
  const { data, error } = await supabase
    .from("avisos")
    .insert({ ...linha, edicao_id: edicao.id, autor_id: eu.id })
    .select("id")
    .single();
  if (error) return falha("Não foi possível publicar.");
  revalidar(data.id);
  return { ok: true, dados: { id: data.id } };
}

export async function alternarFixado(id: string, fixado: boolean): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("avisos").update({ fixado }).eq("id", id);
  if (error) return falha("Não foi possível alterar.");
  revalidar(id);
  return { ok: true };
}

export async function excluirAviso(id: string): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("avisos").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir.");
  revalidar();
  return { ok: true };
}

export async function registrarEnvio(
  avisoId: string,
  filtro: Record<string, unknown>,
  descricao: string,
  destinatarios: number,
): Promise<Resultado> {
  const eu = await requireStaff();
  if (!Number.isInteger(destinatarios) || destinatarios < 0) return falha("Dados inválidos.");
  const supabase = await createClient();
  const { error } = await supabase.from("aviso_envios").insert({
    aviso_id: avisoId,
    filtro: JSON.parse(JSON.stringify(filtro)),
    filtro_descricao: descricao.slice(0, 500),
    destinatarios,
    enviado_por: eu.id,
  });
  if (error) return falha("Não foi possível registrar o envio.");
  revalidar(avisoId);
  return { ok: true };
}
