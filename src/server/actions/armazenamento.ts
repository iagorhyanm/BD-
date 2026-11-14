"use server";

import { revalidatePath } from "next/cache";
import { falha, requireEdg, type Resultado } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarLogAdmin } from "@/lib/logs";

/** Apaga fotos/vídeos de inscrições que nunca foram concluídas (mais de 1 dia). */
export async function limparArquivosOrfaos(): Promise<Resultado<{ apagados: number }>> {
  const eu = await requireEdg();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("arquivos_orfaos_inscricao");
  if (error) return falha("Não foi possível listar os arquivos.");
  const nomes = (data ?? []).map((a) => a.nome);
  for (let i = 0; i < nomes.length; i += 100) {
    const { error: e } = await createAdminClient().storage.from("inscricoes").remove(nomes.slice(i, i + 100));
    if (e) return falha("Não foi possível apagar todos os arquivos.");
  }
  if (nomes.length) {
    await registrarLogAdmin({ ator: eu, acao: "limpou arquivos órfãos", entidade: "armazenamento", descricao: `${nomes.length} arquivo(s)` });
  }
  revalidatePath("/admin/armazenamento");
  return { ok: true, dados: { apagados: nomes.length } };
}
