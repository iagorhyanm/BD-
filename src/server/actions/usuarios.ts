"use server";

import { revalidatePath } from "next/cache";
import { falha, requireAdmin, type Papel, type Resultado } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarLogAdmin } from "@/lib/logs";
import { gerarSenhaProvisoria } from "@/lib/senha";

const ROTA = "/admin/usuarios";
const BANIDO = "876000h";

export type Credenciais = { nome: string; login: string; senha: string };

export async function redefinirSenha(id: string): Promise<Resultado<Credenciais>> {
  const ator = await requireAdmin();
  const admin = createAdminClient();
  const { data: perfil } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!perfil) return falha("Usuário não encontrado.");
  const senha = gerarSenhaProvisoria();
  const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
  if (error) return falha("Não foi possível redefinir a senha.");
  await admin.from("profiles").update({ precisa_trocar_senha: true }).eq("id", id);
  await registrarLogAdmin({ ator, acao: "redefiniu a senha de", entidade: "profiles", entidadeId: id, descricao: perfil.nome });
  revalidatePath(ROTA);
  return { ok: true, dados: { nome: perfil.nome, login: perfil.email ?? perfil.usuario ?? "", senha } };
}

export async function alterarAtivo(id: string, ativo: boolean): Promise<Resultado> {
  const ator = await requireAdmin();
  if (id === ator.id) return falha("Você não pode desativar a sua própria conta.");
  const admin = createAdminClient();
  const { data: perfil, error } = await admin.from("profiles").update({ ativo }).eq("id", id).select("nome").maybeSingle();
  if (error) return falha(error.message.includes("administrador") ? error.message : "Não foi possível alterar.");
  if (!perfil) return falha("Usuário não encontrado.");
  await admin.auth.admin.updateUserById(id, { ban_duration: ativo ? "none" : BANIDO });
  await registrarLogAdmin({ ator, acao: ativo ? "reativou" : "desativou", entidade: "profiles", entidadeId: id, descricao: perfil.nome });
  revalidatePath(ROTA);
  return { ok: true };
}

export async function alterarPapel(id: string, papel: Papel): Promise<Resultado> {
  const ator = await requireAdmin();
  if (id === ator.id) return falha("Você não pode alterar o seu próprio papel.");
  if (papel !== "admin" && papel !== "usuario") return falha("Papel inválido.");
  const admin = createAdminClient();
  const { data: perfil, error } = await admin.from("profiles").update({ papel }).eq("id", id).select("nome").maybeSingle();
  if (error) return falha(error.message.includes("administrador") ? error.message : "Não foi possível alterar.");
  if (!perfil) return falha("Usuário não encontrado.");
  await registrarLogAdmin({
    ator,
    acao: papel === "admin" ? "tornou administrador(a)" : "tirou de administrador(a)",
    entidade: "profiles",
    entidadeId: id,
    descricao: perfil.nome,
  });
  revalidatePath(ROTA);
  return { ok: true };
}
