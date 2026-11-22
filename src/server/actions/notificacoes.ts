"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireUsuario, type Resultado } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { enviarPara, pushConfigurado } from "@/lib/push";

const inscricaoSchema = z.object({
  endpoint: z.string().url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(5).max(100) }),
});

export async function salvarInscricao(inscricao: unknown, aparelho: string): Promise<Resultado> {
  const eu = await requireUsuario();
  const p = inscricaoSchema.safeParse(inscricao);
  if (!p.success) return falha("Não foi possível ativar neste aparelho.");
  const supabase = await createClient();
  // Mesmo aparelho pode ter sido de outra conta: recria.
  await supabase.from("push_inscricoes").delete().eq("endpoint", p.data.endpoint);
  const { error } = await supabase.from("push_inscricoes").insert({
    user_id: eu.id,
    endpoint: p.data.endpoint,
    p256dh: p.data.keys.p256dh,
    auth: p.data.keys.auth,
    aparelho: aparelho.slice(0, 200) || null,
  });
  if (error) {
    // Endpoint cadastrado por outra conta neste aparelho: o RLS não deixa apagar; usa o admin.
    if (error.code === "23505") {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      await admin.from("push_inscricoes").delete().eq("endpoint", p.data.endpoint);
      const r = await admin.from("push_inscricoes").insert({
        user_id: eu.id,
        endpoint: p.data.endpoint,
        p256dh: p.data.keys.p256dh,
        auth: p.data.keys.auth,
        aparelho: aparelho.slice(0, 200) || null,
      });
      if (r.error) return falha("Não foi possível ativar neste aparelho.");
    } else return falha("Não foi possível ativar neste aparelho.");
  }
  revalidatePath("/perfil");
  return { ok: true };
}

export async function removerInscricao(endpoint: string): Promise<Resultado> {
  await requireUsuario();
  const supabase = await createClient();
  await supabase.from("push_inscricoes").delete().eq("endpoint", endpoint);
  revalidatePath("/perfil");
  return { ok: true };
}

const CAMPOS = ["notif_lembrete", "notif_checkins", "notif_comentarios"] as const;

export async function salvarPreferencia(campo: (typeof CAMPOS)[number], valor: boolean): Promise<Resultado> {
  const eu = await requireUsuario();
  if (!CAMPOS.includes(campo)) return falha("Opção inválida.");
  const supabase = await createClient();
  const mudanca: Partial<Record<(typeof CAMPOS)[number], boolean>> = { [campo]: !!valor };
  const { error } = await supabase.from("profiles").update(mudanca).eq("id", eu.id);
  if (error) return falha("Não foi possível salvar.");
  revalidatePath("/perfil");
  return { ok: true };
}

export async function enviarTeste(): Promise<Resultado<{ enviados: number }>> {
  const eu = await requireUsuario();
  if (!pushConfigurado()) return falha("As notificações ainda não estão configuradas no servidor.");
  const enviados = await enviarPara([eu.id], {
    titulo: "Notificações ativadas! 🐀📖",
    corpo: "É assim que você vai receber o lembrete da leitura e as novidades do seu grupo.",
    url: "/",
    tag: "teste",
  }, 600);
  if (!enviados) return falha("Não consegui entregar. Desative e ative de novo neste aparelho.");
  return { ok: true, dados: { enviados } };
}
