"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireUsuario, type Resultado } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EMOJIS_REACAO } from "@/lib/biblia";

const checkinSchema = z.object({
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Escolha o dia da leitura."),
  minutos: z.coerce
    .number({ message: "Informe quantos minutos você leu." })
    .int("Minutos sem vírgula.")
    .min(1, "Informe quantos minutos você leu.")
    .max(600, "Minutos entre 1 e 600."),
  versiculo: z.string().trim().max(500, "Versículo muito longo.").optional(),
  anotacao: z.string().trim().min(3, "Conte o que você aprendeu.").max(3000, "Texto muito longo."),
  foto_path: z.string().min(1, "Adicione uma foto da sua leitura."),
});

function mensagemBanco(msg?: string) {
  if (!msg) return "Não foi possível salvar.";
  if (msg.includes("DATA_ANTIGA")) return "Dá para marcar leituras de até 3 dias atrás.";
  if (msg.includes("DATA_FUTURA")) return "A data não pode ser no futuro.";
  if (msg.includes("checkins_um_por_dia") || msg.includes("duplicate key")) return "Você já marcou a leitura desse dia.";
  if (msg.includes("checkins_data_plano_fkey") || msg.includes("foreign key")) return "Esse dia não tem leitura no plano.";
  if (msg.includes("DATA_FIXA")) return "Não dá para mudar o dia de uma leitura já marcada.";
  if (msg.includes("FOTO_INVALIDA")) return "Envie a foto de novo.";
  if (msg.includes("CAMPOS_OBRIGATORIOS")) return "Preencha o que aprendeu, o tempo de leitura e a foto.";
  return "Não foi possível salvar.";
}

function revalidar(id?: string) {
  revalidatePath("/");
  revalidatePath("/perfil");
  revalidatePath("/grupos", "layout");
  if (id) revalidatePath(`/checkin/${id}`);
}

export async function salvarCheckin(id: string | null, formData: FormData): Promise<Resultado<{ id: string }>> {
  const eu = await requireUsuario();
  const p = checkinSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return falha(p.error.issues[0].message);
  const d = p.data;
  if (!d.foto_path.startsWith(`${eu.id}/`)) return falha("Envie a foto de novo.");
  const foto = d.foto_path;
  const linha = {
    minutos: d.minutos,
    versiculo: d.versiculo || null,
    anotacao: d.anotacao,
    foto_path: foto,
  };
  const supabase = await createClient();
  if (id) {
    const { data: antigo } = await supabase.from("checkins").select("foto_path").eq("id", id).eq("user_id", eu.id).maybeSingle();
    if (!antigo) return falha("Check-in não encontrado.");
    const { error } = await supabase.from("checkins").update(linha).eq("id", id);
    if (error) return falha(mensagemBanco(error.message));
    if (antigo.foto_path && antigo.foto_path !== foto) await supabase.storage.from("checkins").remove([antigo.foto_path]);
    revalidar(id);
    return { ok: true, dados: { id } };
  }
  const { data, error } = await supabase.from("checkins").insert({ ...linha, data: d.data, user_id: eu.id }).select("id").single();
  if (error) return falha(mensagemBanco(error.message));
  revalidar(data.id);
  return { ok: true, dados: { id: data.id } };
}

export async function excluirCheckin(id: string): Promise<Resultado> {
  await requireUsuario();
  const supabase = await createClient();
  const { data: c } = await supabase.from("checkins").select("foto_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("checkins").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir.");
  if (c?.foto_path) await supabase.storage.from("checkins").remove([c.foto_path]);
  revalidar();
  return { ok: true };
}

/* --------------------------- Reações e comentários --------------------------- */

export async function alternarReacao(checkinId: string, emoji: string): Promise<Resultado<{ ativo: boolean }>> {
  const eu = await requireUsuario();
  if (!(EMOJIS_REACAO as readonly string[]).includes(emoji)) return falha("Reação inválida.");
  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("reacoes")
    .select("emoji")
    .eq("checkin_id", checkinId)
    .eq("user_id", eu.id)
    .eq("emoji", emoji)
    .maybeSingle();
  if (existente) {
    await supabase.from("reacoes").delete().eq("checkin_id", checkinId).eq("user_id", eu.id).eq("emoji", emoji);
  } else {
    const { error } = await supabase.from("reacoes").insert({ checkin_id: checkinId, user_id: eu.id, emoji });
    if (error) return falha("Não foi possível reagir.");
  }
  revalidatePath(`/checkin/${checkinId}`);
  return { ok: true, dados: { ativo: !existente } };
}

export async function comentar(checkinId: string, formData: FormData): Promise<Resultado> {
  const eu = await requireUsuario();
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return falha("Escreva um comentário.");
  if (texto.length > 1000) return falha("Comentário muito longo.");
  const supabase = await createClient();
  const { error } = await supabase.from("comentarios").insert({ checkin_id: checkinId, user_id: eu.id, texto });
  if (error) return falha("Não foi possível comentar.");
  revalidatePath(`/checkin/${checkinId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function excluirComentario(id: string, checkinId: string): Promise<Resultado> {
  await requireUsuario();
  const supabase = await createClient();
  const { error } = await supabase.from("comentarios").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir.");
  revalidatePath(`/checkin/${checkinId}`);
  return { ok: true };
}
