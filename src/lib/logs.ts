import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { Perfil } from "@/lib/auth";

/**
 * Registra no log uma ação feita com a service role (onde o trigger
 * do banco não sabe quem é o usuário). Falhas de log não interrompem a ação.
 */
export async function registrarLogAdmin(params: {
  ator: Pick<Perfil, "id" | "nome">;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  descricao?: string | null;
  dados?: Json;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("logs").insert({
      ator_id: params.ator.id,
      ator_nome: params.ator.nome,
      acao: params.acao,
      entidade: params.entidade,
      entidade_id: params.entidadeId ?? null,
      descricao: params.descricao ?? null,
      dados: params.dados ?? null,
    });
  } catch (e) {
    console.error("Falha ao registrar log", e);
  }
}
