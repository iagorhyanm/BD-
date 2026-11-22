import "server-only";
import { createClient } from "@/lib/supabase/server";
import { hojeEmBelem, somarDias } from "@/lib/datas";

export type DiaPlano = { data: string; leitura: string; titulo: string | null; texto: string | null };

/** Dias do plano que a pessoa ainda pode marcar (hoje e até 3 dias atrás), com o status de cada um. */
export async function diasMarcaveis(userId: string) {
  const supabase = await createClient();
  const hoje = hojeEmBelem();
  const [{ data: dias }, { data: feitos }] = await Promise.all([
    supabase.from("plano_dias").select("data, leitura, titulo, texto").gte("data", somarDias(hoje, -3)).lte("data", hoje).order("data", { ascending: false }),
    supabase.from("checkins").select("id, data").eq("user_id", userId).gte("data", somarDias(hoje, -3)),
  ]);
  const porData = new Map((feitos ?? []).map((f) => [f.data, f.id]));
  return (dias ?? []).map((d) => ({ ...d, checkinId: porData.get(d.data) ?? null }));
}
