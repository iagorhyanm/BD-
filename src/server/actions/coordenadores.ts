"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireEdg, type Papel, type Resultado } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarLogAdmin } from "@/lib/logs";
import { gerarSenhaProvisoria } from "@/lib/senha";
import { ehEmail, identificadorParaEmail, normalizarIdentificador, REGEX_USUARIO } from "@/lib/login";
import { normalizarTelefone, telefoneValido } from "@/lib/telefone";

const ROTA = "/admin/coordenadores";
/** "Banimento" longo do Supabase Auth = usuário desativado. */
const BANIDO = "876000h";

const telefoneOpcional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normalizarTelefone(v) : ""))
  .refine((v) => v === "" || telefoneValido(v), "Telefone inválido. Use DDD + número.");

const novoSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo."),
  login: z
    .string()
    .trim()
    .min(1, "Informe o e-mail ou o usuário.")
    .transform(normalizarIdentificador)
    .refine(
      (v) => (v.includes("@") ? ehEmail(v) : REGEX_USUARIO.test(v)),
      "Use um e-mail válido ou um usuário com 3 a 30 letras minúsculas, números, ponto, hífen ou _.",
    ),
  telefone: telefoneOpcional,
});

const edicaoSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo."),
  telefone: telefoneOpcional,
});

export type Credenciais = { nome: string; login: string; senha: string; telefone: string | null };

export async function criarCoordenador(formData: FormData): Promise<Resultado<Credenciais>> {
  const ator = await requireEdg();
  const parsed = novoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falha(parsed.error.issues[0].message);

  const { nome, login, telefone } = parsed.data;
  const ehLoginEmail = login.includes("@");
  const email = identificadorParaEmail(login);
  const senha = gerarSenhaProvisoria();
  const admin = createAdminClient();

  const { data: criado, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error || !criado.user) {
    if (error?.code === "email_exists" || error?.status === 422) {
      return falha("Já existe um usuário com esse login.");
    }
    console.error(error);
    return falha("Não foi possível criar o usuário. Tente novamente.");
  }

  const { error: erroPerfil } = await admin.from("profiles").insert({
    id: criado.user.id,
    nome,
    email: ehLoginEmail ? email : null,
    usuario: ehLoginEmail ? null : login,
    telefone: telefone || null,
    papel: "coordenador",
    precisa_trocar_senha: true,
  });
  if (erroPerfil) {
    await admin.auth.admin.deleteUser(criado.user.id);
    if (erroPerfil.code === "23505") return falha("Já existe um usuário com esse login.");
    console.error(erroPerfil);
    return falha("Não foi possível criar o perfil. Tente novamente.");
  }

  await registrarLogAdmin({
    ator,
    acao: "criou",
    entidade: "profiles",
    entidadeId: criado.user.id,
    descricao: nome,
  });
  revalidatePath(ROTA);
  return { ok: true, dados: { nome, login, senha, telefone: telefone || null } };
}

export async function editarCoordenador(id: string, formData: FormData): Promise<Resultado> {
  const ator = await requireEdg();
  const parsed = edicaoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falha(parsed.error.issues[0].message);

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ nome: parsed.data.nome, telefone: parsed.data.telefone || null })
    .eq("id", id);
  if (error) return falha("Não foi possível salvar.");

  await admin.auth.admin.updateUserById(id, { user_metadata: { nome: parsed.data.nome } });
  await registrarLogAdmin({ ator, acao: "alterou", entidade: "profiles", entidadeId: id, descricao: parsed.data.nome });
  revalidatePath(ROTA);
  return { ok: true };
}

export async function redefinirSenha(id: string): Promise<Resultado<Credenciais>> {
  const ator = await requireEdg();
  const admin = createAdminClient();
  const { data: perfil } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!perfil) return falha("Usuário não encontrado.");

  const senha = gerarSenhaProvisoria();
  const { error } = await admin.auth.admin.updateUserById(id, { password: senha });
  if (error) return falha("Não foi possível redefinir a senha.");

  await admin.from("profiles").update({ precisa_trocar_senha: true }).eq("id", id);
  await registrarLogAdmin({ ator, acao: "redefiniu a senha de", entidade: "profiles", entidadeId: id, descricao: perfil.nome });
  revalidatePath(ROTA);
  return {
    ok: true,
    dados: { nome: perfil.nome, login: perfil.usuario ?? perfil.email ?? "", senha, telefone: perfil.telefone },
  };
}

export async function alterarAtivo(id: string, ativo: boolean): Promise<Resultado> {
  const ator = await requireEdg();
  if (id === ator.id) return falha("Você não pode desativar o seu próprio acesso.");

  const admin = createAdminClient();
  const { data: perfil, error } = await admin
    .from("profiles")
    .update({ ativo })
    .eq("id", id)
    .select("nome")
    .maybeSingle();
  if (error) return falha(error.message.includes("EDG") ? error.message : "Não foi possível alterar.");
  if (!perfil) return falha("Usuário não encontrado.");

  // Bloqueia/desbloqueia também no Auth, para derrubar o login imediatamente.
  await admin.auth.admin.updateUserById(id, { ban_duration: ativo ? "none" : BANIDO });

  await registrarLogAdmin({
    ator,
    acao: ativo ? "reativou" : "desativou",
    entidade: "profiles",
    entidadeId: id,
    descricao: perfil.nome,
  });
  revalidatePath(ROTA);
  return { ok: true };
}

export async function alterarPapel(id: string, papel: Papel): Promise<Resultado> {
  const ator = await requireEdg();
  if (id === ator.id) return falha("Você não pode alterar o seu próprio papel.");
  if (papel !== "edg" && papel !== "coordenador") return falha("Papel não disponível.");

  const admin = createAdminClient();
  const { data: perfil, error } = await admin
    .from("profiles")
    .update({ papel })
    .eq("id", id)
    .select("nome")
    .maybeSingle();
  if (error) return falha(error.message.includes("EDG") ? error.message : "Não foi possível alterar o papel.");
  if (!perfil) return falha("Usuário não encontrado.");

  await registrarLogAdmin({
    ator,
    acao: papel === "edg" ? "promoveu a EDG" : "tornou coordenador(a)",
    entidade: "profiles",
    entidadeId: id,
    descricao: perfil.nome,
  });
  revalidatePath(ROTA);
  return { ok: true };
}
