"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireStaff, type Resultado } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import { MOMENTOS, normalizarUrl } from "@/lib/dominio";

const VALORES_MOMENTO = MOMENTOS.map((m) => m.valor) as [string, ...string[]];

const musicaSchema = z.object({
  titulo: z.string().trim().min(1, "Informe o título.").max(200),
  artista: z.string().trim().max(200).optional(),
  tom: z.string().trim().max(10).optional(),
  bpm: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 20 && v <= 300), "BPM inválido (20 a 300)."),
  cifra_url: z.string().trim().max(500).optional(),
  media_url: z.string().trim().max(500).optional(),
  observacoes: z.string().trim().max(3000).optional(),
});

function revalidarRepertorio() {
  revalidatePath("/repertorio");
  revalidatePath("/agenda", "layout");
}

export async function salvarMusica(id: string | null, formData: FormData): Promise<Resultado<{ id: string }>> {
  const eu = await requireStaff();
  const p = musicaSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return falha(p.error.issues[0].message);
  const momentos = z.array(z.enum(VALORES_MOMENTO)).safeParse(formData.getAll("momentos"));
  if (!momentos.success) return falha("Momento inválido.");
  const interpretes = z.array(z.string().uuid()).safeParse(formData.getAll("interpretes"));
  if (!interpretes.success) return falha("Intérprete inválido.");
  const d = p.data;

  const linha = {
    titulo: d.titulo,
    artista: d.artista || null,
    tom: d.tom || null,
    bpm: d.bpm,
    momentos: momentos.data,
    cifra_url: normalizarUrl(d.cifra_url),
    media_url: normalizarUrl(d.media_url),
    observacoes: d.observacoes || null,
  };

  const supabase = await createClient();
  let musicaId = id;
  if (id) {
    const { error } = await supabase.from("musicas").update(linha).eq("id", id);
    if (error) return falha("Não foi possível salvar a música.");
  } else {
    const { data, error } = await supabase.from("musicas").insert({ ...linha, criado_por: eu.id }).select("id").single();
    if (error) return falha("Não foi possível cadastrar a música.");
    musicaId = data.id;
  }

  // Intérpretes: substitui apenas os da edição atual (a biblioteca é compartilhada).
  const edicao = await obterEdicaoAtual();
  if (edicao) {
    const { data: daEdicao } = await supabase.from("membros").select("id").eq("edicao_id", edicao.id);
    const idsEdicao = (daEdicao ?? []).map((m) => m.id);
    if (idsEdicao.length) {
      await supabase.from("musica_interpretes").delete().eq("musica_id", musicaId!).in("membro_id", idsEdicao);
    }
    const validos = interpretes.data.filter((i) => idsEdicao.includes(i));
    if (validos.length) {
      await supabase.from("musica_interpretes").insert(validos.map((m) => ({ musica_id: musicaId!, membro_id: m })));
    }
  }

  revalidarRepertorio();
  return { ok: true, dados: { id: musicaId! } };
}

export async function excluirMusica(id: string): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("musicas").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") return falha("Esta música está em uma setlist. Remova-a das setlists antes de excluir.");
    return falha("Não foi possível excluir.");
  }
  revalidarRepertorio();
  return { ok: true };
}

/* ------------------------------ Setlists ------------------------------ */

const setlistSchema = z.object({
  titulo: z.string().trim().min(1, "Informe o título.").max(150),
  observacoes: z.string().trim().max(2000).optional(),
  evento_id: z.string().optional(),
});

export async function salvarSetlist(id: string | null, formData: FormData): Promise<Resultado<{ id: string }>> {
  await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) return falha("Crie uma edição primeiro.");
  const p = setlistSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return falha(p.error.issues[0].message);
  const eventoId = p.data.evento_id && /^[0-9a-f-]{36}$/.test(p.data.evento_id) ? p.data.evento_id : null;

  const supabase = await createClient();
  const linha = { titulo: p.data.titulo, observacoes: p.data.observacoes || null, evento_id: eventoId };
  if (id) {
    const { error } = await supabase.from("setlists").update(linha).eq("id", id);
    if (error) {
      if (error.code === "23505") return falha("Esse evento já tem outra setlist.");
      return falha("Não foi possível salvar.");
    }
    revalidarRepertorio();
    revalidatePath(`/repertorio/setlists/${id}`);
    return { ok: true, dados: { id } };
  }
  const { data, error } = await supabase
    .from("setlists")
    .insert({ ...linha, edicao_id: edicao.id })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return falha("Esse evento já tem uma setlist.");
    return falha("Não foi possível criar a setlist.");
  }
  revalidarRepertorio();
  return { ok: true, dados: { id: data.id } };
}

export async function excluirSetlist(id: string): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("setlists").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir.");
  revalidarRepertorio();
  return { ok: true };
}

const itensSchema = z
  .array(
    z.object({
      musica_id: z.string().uuid(),
      tom: z.string().trim().max(10).nullable().optional(),
      observacao: z.string().trim().max(300).nullable().optional(),
    }),
  )
  .max(100);

/** Substitui todos os itens da setlist (na ordem recebida). */
export async function salvarItensSetlist(setlistId: string, itens: unknown): Promise<Resultado> {
  await requireStaff();
  const p = itensSchema.safeParse(itens);
  if (!p.success) return falha("Itens inválidos.");
  const supabase = await createClient();
  const { error: e1 } = await supabase.from("setlist_itens").delete().eq("setlist_id", setlistId);
  if (e1) return falha("Não foi possível salvar.");
  if (p.data.length) {
    const { error } = await supabase.from("setlist_itens").insert(
      p.data.map((i, ordem) => ({
        setlist_id: setlistId,
        musica_id: i.musica_id,
        ordem,
        tom: i.tom || null,
        observacao: i.observacao || null,
      })),
    );
    if (error) return falha("Não foi possível salvar os itens.");
  }
  revalidarRepertorio();
  revalidatePath(`/repertorio/setlists/${setlistId}`);
  return { ok: true };
}
