"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { falha, requireAdmin, type Resultado } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarLogAdmin } from "@/lib/logs";
import { notificarAdicionados } from "@/lib/push";

const uuid = z.string().uuid();

function revalidar(grupoId: string) {
  revalidatePath("/admin/desafios");
  revalidatePath(`/admin/desafios/${grupoId}`);
  revalidatePath("/admin/usuarios");
  revalidatePath("/grupos", "layout");
  revalidatePath("/");
}

/** Coloca pessoas já cadastradas direto num desafio (sem link nem código). */
export async function adicionarAoDesafio(grupoId: string, userIds: string[]): Promise<Resultado<{ adicionados: number }>> {
  const ator = await requireAdmin();
  if (!uuid.safeParse(grupoId).success) return falha("Desafio inválido.");
  const ids = [...new Set(userIds)].filter((id) => uuid.safeParse(id).success);
  if (!ids.length) return falha("Escolha pelo menos uma pessoa.");
  if (ids.length > 500) return falha("Escolha no máximo 500 pessoas por vez.");

  const admin = createAdminClient();
  const { data: grupo } = await admin.from("grupos").select("id, nome").eq("id", grupoId).maybeSingle();
  if (!grupo) return falha("Desafio não encontrado.");
  const [{ data: perfis }, { data: jaEstao }] = await Promise.all([
    admin.from("profiles").select("id, nome").in("id", ids).eq("ativo", true),
    admin.from("grupo_membros").select("user_id").eq("grupo_id", grupoId).in("user_id", ids),
  ]);
  const ja = new Set((jaEstao ?? []).map((m) => m.user_id));
  const novos = (perfis ?? []).filter((p) => !ja.has(p.id));
  if (!novos.length) return falha("Essas pessoas já estão no desafio (ou estão com a conta desativada).");

  const { error } = await admin.from("grupo_membros").insert(novos.map((p) => ({ grupo_id: grupoId, user_id: p.id, papel: "membro" as const })));
  if (error) return falha("Não foi possível adicionar.");
  await registrarLogAdmin({
    ator,
    acao: "adicionou ao desafio",
    entidade: "grupo_membros",
    entidadeId: grupoId,
    descricao: `${grupo.nome}: ${novos.map((p) => p.nome).join(", ")}`,
  });
  after(() => notificarAdicionados(novos.map((p) => p.id), grupo, ator.nome).catch((e) => console.error("push adicionados", e)));
  revalidar(grupoId);
  return { ok: true, dados: { adicionados: novos.length } };
}

export async function removerDoDesafio(grupoId: string, userId: string): Promise<Resultado> {
  const ator = await requireAdmin();
  if (!uuid.safeParse(grupoId).success || !uuid.safeParse(userId).success) return falha("Dados inválidos.");
  const admin = createAdminClient();
  const { data: m } = await admin
    .from("grupo_membros")
    .select("papel, profiles(nome), grupos(nome)")
    .eq("grupo_id", grupoId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!m) return falha("Essa pessoa não está no desafio.");
  if (m.papel === "dono") return falha("O dono do desafio não pode ser removido.");
  const { error } = await admin.from("grupo_membros").delete().eq("grupo_id", grupoId).eq("user_id", userId);
  if (error) return falha("Não foi possível remover.");
  await registrarLogAdmin({
    ator,
    acao: "removeu do desafio",
    entidade: "grupo_membros",
    entidadeId: grupoId,
    descricao: `${(m.grupos as { nome: string } | null)?.nome}: ${(m.profiles as { nome: string } | null)?.nome}`,
  });
  revalidar(grupoId);
  return { ok: true };
}
