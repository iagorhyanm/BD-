import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { tema } from "@/theme.config";

export type Config = {
  nome: string;
  slogan: string;
  boasVindas: string;
  aviso: string | null;
};

/** Configurações gerais (editáveis pelo admin). Cai no tema se o banco não responder. */
export const obterConfig = cache(async (): Promise<Config> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("app_config").select("*").eq("id", 1).maybeSingle();
    if (data) {
      return {
        nome: data.nome,
        slogan: data.slogan,
        boasVindas: data.boas_vindas,
        aviso: data.aviso_ativo && data.aviso_texto ? data.aviso_texto : null,
      };
    }
  } catch {
    /* usa o padrão */
  }
  return { nome: tema.nome, slogan: tema.slogan, boasVindas: "Bem-vindo(a)! Bora manter a sequência? 🔥", aviso: null };
});
