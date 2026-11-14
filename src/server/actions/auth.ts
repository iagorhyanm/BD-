"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { identificadorParaEmail } from "@/lib/login";
import { validarSenhaNova } from "@/lib/senha";
import { obterSessao } from "@/lib/auth";

export type EstadoForm = { erro?: string } | undefined;

const loginSchema = z.object({
  identificador: z.string().trim().min(1, "Informe seu e-mail ou usuário."),
  senha: z.string().min(1, "Informe sua senha."),
  voltar: z.string().optional(),
});

function destinoSeguro(voltar?: string) {
  return voltar && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/";
}

export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const { identificador, senha, voltar } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identificadorParaEmail(identificador),
    password: senha,
  });

  if (error || !data.user) {
    if (error?.code === "user_banned") {
      return { erro: "Seu acesso está desativado. Fale com o EDG da equipe." };
    }
    return { erro: "E-mail/usuário ou senha incorretos." };
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("ativo, papel, precisa_trocar_senha")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!perfil || !perfil.ativo || perfil.papel === "membro") {
    await supabase.auth.signOut();
    return { erro: "Seu usuário ainda não tem acesso ao sistema. Fale com o EDG." };
  }

  redirect(perfil.precisa_trocar_senha ? "/trocar-senha" : destinoSeguro(voltar));
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const trocaSchema = z
  .object({
    senha: z.string(),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: "As senhas não conferem." });

export async function trocarSenha(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const sessao = await obterSessao();
  if (!sessao?.perfil) redirect("/login");

  const parsed = trocaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };

  const erroSenha = validarSenhaNova(parsed.data.senha);
  if (erroSenha) return { erro: erroSenha };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });
  if (error) {
    if (error.code === "same_password") return { erro: "A nova senha precisa ser diferente da provisória." };
    if (error.code === "weak_password") return { erro: "Senha muito fraca. Tente outra." };
    return { erro: "Não foi possível trocar a senha. Tente novamente." };
  }

  // A pessoa não pode editar o próprio perfil (RLS), então o servidor marca a troca.
  const admin = createAdminClient();
  await admin.from("profiles").update({ precisa_trocar_senha: false }).eq("id", sessao.user.id);

  redirect("/");
}
