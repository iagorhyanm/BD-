"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireStaff, type Resultado } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { arquivosDaInscricao, type Pergunta } from "@/lib/inscricao";

const STATUS = ["pendente", "em_analise", "selecionado", "lista_espera", "nao_selecionado"] as const;
const ids = z.array(z.string().uuid()).min(1, "Selecione pelo menos uma pessoa.").max(500);

function revalidar(id?: string) {
  revalidatePath("/selecao");
  if (id) revalidatePath(`/selecao/${id}`);
  revalidatePath("/");
}

export async function alterarStatus(lista: string[], status: (typeof STATUS)[number]): Promise<Resultado> {
  await requireStaff();
  const p = ids.safeParse(lista);
  if (!p.success) return falha(p.error.issues[0].message);
  if (!STATUS.includes(status)) return falha("Status inválido.");

  const supabase = await createClient();
  const { error } = await supabase.from("inscricoes").update({ status }).in("id", p.data);
  if (error) return falha("Não foi possível alterar o status.");
  revalidar(p.data.length === 1 ? p.data[0] : undefined);
  return { ok: true };
}

export async function puxarParaEquipe(lista: string[]): Promise<Resultado<{ novos: number }>> {
  await requireStaff();
  const p = ids.safeParse(lista);
  if (!p.success) return falha(p.error.issues[0].message);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("puxar_para_equipe", { p_ids: p.data });
  if (error) return falha("Não foi possível puxar para a equipe.");
  revalidar(p.data.length === 1 ? p.data[0] : undefined);
  revalidatePath("/membros");
  return { ok: true, dados: { novos: data ?? 0 } };
}

const avaliacaoSchema = z.object({
  nota: z.coerce.number().int().min(1, "Escolha uma nota de 1 a 5.").max(5),
  comentario: z.string().trim().max(2000).optional(),
});

export async function avaliar(inscricaoId: string, formData: FormData): Promise<Resultado> {
  const eu = await requireStaff();
  const p = avaliacaoSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return falha(p.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.from("avaliacoes").upsert(
    {
      inscricao_id: inscricaoId,
      coordenador_id: eu.id,
      nota: p.data.nota,
      comentario: p.data.comentario || null,
    },
    { onConflict: "inscricao_id,coordenador_id" },
  );
  if (error) return falha("Não foi possível salvar a avaliação.");
  revalidar(inscricaoId);
  return { ok: true };
}

export async function removerAvaliacao(inscricaoId: string): Promise<Resultado> {
  const eu = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("avaliacoes")
    .delete()
    .eq("inscricao_id", inscricaoId)
    .eq("coordenador_id", eu.id);
  if (error) return falha("Não foi possível remover.");
  revalidar(inscricaoId);
  return { ok: true };
}

export async function excluirInscricao(id: string): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { data: insc } = await supabase
    .from("inscricoes")
    .select("respostas, formularios(perguntas(id, tipo))")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("inscricoes").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir a inscrição.");
  // LGPD: apaga também a foto e o vídeo enviados.
  const arquivos = insc
    ? arquivosDaInscricao(
        (insc.formularios?.perguntas ?? []) as Pick<Pergunta, "id" | "tipo">[],
        (insc.respostas ?? {}) as Record<string, unknown>,
      )
    : [];
  if (arquivos.length) await supabase.storage.from("inscricoes").remove(arquivos);
  revalidar();
  return { ok: true };
}
