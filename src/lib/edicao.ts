import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Edicao = Database["public"]["Tables"]["edicoes"]["Row"];

export const COOKIE_EDICAO = "bandinha_edicao";

/** Todas as edições, mais recentes primeiro. */
export const listarEdicoes = cache(async (): Promise<Edicao[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edicoes")
    .select("*")
    .order("ano", { ascending: false, nullsFirst: false })
    .order("criado_em", { ascending: false });
  return data ?? [];
});

/**
 * Edição que o usuário está visualizando:
 * 1) a escolhida no seletor (cookie); 2) a ativa; 3) a mais recente.
 */
export const obterEdicaoAtual = cache(async (): Promise<Edicao | null> => {
  const edicoes = await listarEdicoes();
  if (edicoes.length === 0) return null;
  const escolhida = (await cookies()).get(COOKIE_EDICAO)?.value;
  return (
    edicoes.find((e) => e.id === escolhida) ?? edicoes.find((e) => e.ativa) ?? edicoes[0]
  );
});
