"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireUsuario, type Resultado } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function salvarNome(formData: FormData): Promise<Resultado> {
  const eu = await requireUsuario();
  const p = z.string().trim().min(2, "Informe seu nome.").max(80).safeParse(formData.get("nome"));
  if (!p.success) return falha(p.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ nome: p.data }).eq("id", eu.id);
  if (error) return falha("Não foi possível salvar.");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Salva (ou remove, com null) a foto de perfil já enviada ao bucket "avatares". */
export async function salvarFoto(path: string | null): Promise<Resultado> {
  const eu = await requireUsuario();
  if (path !== null && !new RegExp(`^${eu.id}/[0-9a-f-]{36}\\.jpg$`).test(path)) return falha("Envie a foto de novo.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ foto_path: path }).eq("id", eu.id);
  if (error) return falha("Não foi possível salvar a foto.");
  // apaga as fotos antigas
  const { data: arquivos } = await supabase.storage.from("avatares").list(eu.id);
  const antigos = (arquivos ?? []).map((a) => `${eu.id}/${a.name}`).filter((p) => p !== path);
  if (antigos.length) await supabase.storage.from("avatares").remove(antigos);
  revalidatePath("/", "layout");
  return { ok: true };
}
