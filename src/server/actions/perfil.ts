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
