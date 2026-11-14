"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/publico";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  camposFixosSchema,
  mensagemErroInscricao,
  validarResposta,
  type Pergunta,
  type Resposta,
} from "@/lib/inscricao";

export type ResultadoInscricao =
  | { ok: true; mensagem: string }
  | { ok: false; erro: string; campos?: Record<string, string> };

/** Limite por IP e formulário: 20 envios a cada 10 minutos (a igreja pode dividir o mesmo Wi-Fi). */
const LIMITE = 20;
const JANELA_SEGUNDOS = 600;

async function dentroDoLimite(formularioId: string): Promise<boolean> {
  try {
    const h = await headers();
    const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
    const chave = createHash("sha256").update(`${ip}|${formularioId}`).digest("hex");
    const { data, error } = await createAdminClient().rpc("consumir_rate_limit", {
      p_chave: chave,
      p_limite: LIMITE,
      p_janela_segundos: JANELA_SEGUNDOS,
    });
    if (error) throw error;
    return data !== false;
  } catch (e) {
    console.error("rate limit indisponível", e);
    return true; // não bloqueia inscrições legítimas se o controle falhar
  }
}

export async function enviarInscricao(slug: string, formData: FormData): Promise<ResultadoInscricao> {
  // Honeypot: campo invisível que só robôs preenchem. Finge sucesso.
  if (String(formData.get("site") ?? "").trim() !== "") {
    return { ok: true, mensagem: "Inscrição recebida!" };
  }
  // Envio rápido demais (menos de 3s depois de abrir a página) = robô.
  const t = Number(formData.get("t"));
  if (Number.isFinite(t) && Date.now() - t < 3000) {
    return { ok: true, mensagem: "Inscrição recebida!" };
  }

  const publico = createPublicClient();
  const { data: form } = await publico.rpc("formulario_publico", { p_slug: slug });
  const f = form as { id: string; situacao: string; msg_confirmacao: string; perguntas: Pergunta[] } | null;
  if (!f) return { ok: false, erro: "Formulário não encontrado." };
  if (f.situacao !== "aberto") return { ok: false, erro: mensagemErroInscricao(`FORMULARIO_${f.situacao.toUpperCase()}`) };

  if (!(await dentroDoLimite(f.id))) {
    return { ok: false, erro: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo." };
  }

  // Campos fixos
  const fixos = camposFixosSchema.safeParse(Object.fromEntries(formData));
  const campos: Record<string, string> = {};
  if (!fixos.success) {
    for (const issue of fixos.error.issues) {
      const k = String(issue.path[0] ?? "geral");
      campos[k] ??= issue.message;
    }
  }

  // Perguntas personalizadas
  let respostasRecebidas: Record<string, Resposta> = {};
  try {
    respostasRecebidas = JSON.parse(String(formData.get("respostas") ?? "{}"));
  } catch {
    /* ignora */
  }
  const respostas: Record<string, Resposta> = {};
  for (const p of f.perguntas) {
    const v = respostasRecebidas[p.id];
    const erro = validarResposta(p, v);
    if (erro) campos[`p_${p.id}`] = erro;
    else if (v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)) respostas[p.id] = v;
  }

  if (!fixos.success || Object.keys(campos).length) {
    return { ok: false, erro: "Confira os campos destacados.", campos };
  }

  const d = fixos.data;
  const { error } = await publico.from("inscricoes").insert({
    formulario_id: f.id,
    edicao_id: "00000000-0000-0000-0000-000000000000", // definido pelo banco a partir do formulário
    idade: 0, // calculada pelo banco
    nome: d.nome,
    nascimento: d.nascimento,
    telefone: d.telefone,
    sexo: d.sexo,
    ja_trabalhou: d.ja_trabalhou === "sim",
    equipe_anterior: d.ja_trabalhou === "sim" ? d.equipe_anterior : null,
    ano_anterior: d.ja_trabalhou === "sim" ? Number(d.ano_anterior) : null,
    cidade: d.cidade,
    respostas,
    consentimento: true,
    resp_nome: d.resp_nome || null,
    resp_telefone: d.resp_telefone || null,
    resp_consentimento: d.resp_consentimento === "on" ? true : null,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, erro: mensagemErroInscricao(error.message, error.code), campos: { telefone: "Este telefone já foi inscrito." } };
    }
    console.error("erro ao inserir inscrição", error.code, error.message);
    return { ok: false, erro: mensagemErroInscricao(error.message, error.code) };
  }

  return { ok: true, mensagem: f.msg_confirmacao };
}
