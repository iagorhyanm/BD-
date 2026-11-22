"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ehEmail, identificadorParaEmail } from "@/lib/login";
import { validarSenhaNova } from "@/lib/senha";
import { obterSessao } from "@/lib/auth";

export type EstadoForm = { erro?: string } | undefined;

function destinoSeguro(voltar?: string | null) {
  return voltar && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/";
}

const loginSchema = z.object({
  identificador: z.string().trim().min(1, "Informe seu e-mail."),
  senha: z.string().min(1, "Informe sua senha."),
  voltar: z.string().optional(),
});

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
    if (error?.code === "user_banned") return { erro: "Sua conta está desativada. Fale com um administrador." };
    return { erro: "E-mail ou senha incorretos." };
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("ativo, precisa_trocar_senha")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!perfil?.ativo) {
    await supabase.auth.signOut();
    return { erro: "Sua conta está desativada. Fale com um administrador." };
  }
  redirect(perfil.precisa_trocar_senha ? "/trocar-senha" : destinoSeguro(voltar));
}

const cadastroSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome.").max(80, "Nome muito longo."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .refine(ehEmail, "Informe um e-mail válido."),
    senha: z.string(),
    confirmacao: z.string(),
    voltar: z.string().optional(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: "As senhas não conferem.", path: ["confirmacao"] });

export async function cadastrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const parsed = cadastroSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const erroSenha = validarSenhaNova(parsed.data.senha);
  if (erroSenha) return { erro: erroSenha };

  const { nome, email, senha, voltar } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  });
  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return { erro: "Já existe uma conta com esse e-mail. Tente entrar." };
    }
    if (error.code === "weak_password") return { erro: "Senha muito fraca. Tente outra." };
    if (error.code === "over_request_rate_limit" || error.status === 429) {
      return { erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
    }
    if (error.code === "signup_disabled") return { erro: "Os cadastros estão fechados no momento." };
    console.error("erro no cadastro", error.code, error.message);
    return { erro: "Não foi possível criar a conta. Tente novamente." };
  }
  if (!data.session) {
    // Projeto exigindo confirmação por e-mail (não é o padrão do BibleRats).
    return { erro: "Conta criada! Confirme seu e-mail para entrar." };
  }
  redirect(destinoSeguro(voltar));
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const trocaSchema = z
  .object({ senha: z.string(), confirmacao: z.string() })
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
    if (error.code === "same_password") return { erro: "A nova senha precisa ser diferente da atual." };
    if (error.code === "weak_password") return { erro: "Senha muito fraca. Tente outra." };
    return { erro: "Não foi possível trocar a senha. Tente novamente." };
  }
  if (sessao.perfil.precisa_trocar_senha) {
    // A pessoa não pode mudar esse campo sozinha (RLS); o servidor marca a troca.
    await createAdminClient().from("profiles").update({ precisa_trocar_senha: false }).eq("id", sessao.user.id);
  }
  redirect("/");
}
