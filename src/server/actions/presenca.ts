"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireStaff, type Resultado } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const registroSchema = z.object({
  membro_id: z.string().uuid(),
  status: z.enum(["presente", "falta", "justificada", "atraso"]).nullable(),
  motivo: z.string().trim().max(500).nullable().optional(),
});

/** Salva a chamada inteira de um evento. Status nulo = sem registro (apaga). */
export async function salvarChamada(eventoId: string, registros: unknown): Promise<Resultado> {
  const eu = await requireStaff();
  const p = z.array(registroSchema).max(500).safeParse(registros);
  if (!p.success) return falha("Dados da chamada inválidos.");

  const semMotivo = p.data.find((r) => r.status === "justificada" && !r.motivo);
  if (semMotivo) return falha("Informe o motivo de todas as faltas justificadas.");

  const supabase = await createClient();
  const salvar = p.data.filter((r) => r.status);
  const apagar = p.data.filter((r) => !r.status).map((r) => r.membro_id);

  if (salvar.length) {
    const { error } = await supabase.from("presencas").upsert(
      salvar.map((r) => ({
        evento_id: eventoId,
        membro_id: r.membro_id,
        status: r.status!,
        motivo: r.status === "justificada" ? r.motivo! : r.motivo || null,
        registrado_por: eu.id,
      })),
      { onConflict: "evento_id,membro_id" },
    );
    if (error) return falha("Não foi possível salvar a chamada.");
  }
  if (apagar.length) {
    await supabase.from("presencas").delete().eq("evento_id", eventoId).in("membro_id", apagar);
  }

  await supabase.rpc("registrar_log", {
    p_acao: "fez a chamada de",
    p_entidade: "eventos",
    p_entidade_id: eventoId,
    p_descricao: `${salvar.length} registro(s)`,
  });

  revalidatePath("/presenca");
  revalidatePath(`/presenca/${eventoId}`);
  revalidatePath(`/agenda/${eventoId}`);
  revalidatePath("/membros");
  revalidatePath("/");
  return { ok: true };
}
