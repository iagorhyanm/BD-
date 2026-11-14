"use server";

import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/publico";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  MAX_FOTO_BYTES,
  MAX_VIDEO_BYTES,
  TIPOS_FOTO,
  TIPOS_VIDEO,
  arquivosDaInscricao,
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

async function dentroDoLimite(formularioId: string, escopo = "envio", limite = LIMITE): Promise<boolean> {
  try {
    const h = await headers();
    const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconhecido";
    const chave = createHash("sha256").update(`${ip}|${formularioId}|${escopo}`).digest("hex");
    const { data, error } = await createAdminClient().rpc("consumir_rate_limit", {
      p_chave: chave,
      p_limite: limite,
      p_janela_segundos: JANELA_SEGUNDOS,
    });
    if (error) throw error;
    return data !== false;
  } catch (e) {
    console.error("rate limit indisponível", e);
    return true; // não bloqueia inscrições legítimas se o controle falhar
  }
}

const EXTENSAO: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "video/3gpp": "3gp",
  "video/x-matroska": "mkv",
};

export type AutorizacaoUpload =
  | { ok: true; path: string; signedUrl: string }
  | { ok: false; erro: string };

/**
 * Autoriza o envio de UM arquivo (foto ou vídeo) para o formulário aberto.
 * Devolve uma URL assinada de uso único; o arquivo vai direto do celular para
 * o Storage (sem passar pelo servidor), num bucket privado.
 */
export async function prepararUpload(
  slug: string,
  tipo: "foto" | "video",
  mime: string,
  tamanho: number,
): Promise<AutorizacaoUpload> {
  const permitidos = tipo === "foto" ? TIPOS_FOTO : TIPOS_VIDEO;
  const maximo = tipo === "foto" ? MAX_FOTO_BYTES : MAX_VIDEO_BYTES;
  const mimeBase = (mime || "").split(";")[0].toLowerCase();
  if (!permitidos.includes(mimeBase)) {
    return { ok: false, erro: tipo === "foto" ? "Envie uma imagem JPG, PNG ou WEBP." : "Formato de vídeo não aceito. Use MP4 ou MOV, ou cole um link." };
  }
  if (!Number.isFinite(tamanho) || tamanho <= 0 || tamanho > maximo) {
    return {
      ok: false,
      erro: tipo === "foto" ? "Foto muito grande." : "O vídeo passa de 50 MB. Grave mais curto (até 1 minuto) ou envie um link.",
    };
  }

  const { data: form } = await createPublicClient().rpc("formulario_publico", { p_slug: slug });
  const f = form as { id: string; situacao: string } | null;
  if (!f) return { ok: false, erro: "Formulário não encontrado." };
  if (f.situacao !== "aberto") return { ok: false, erro: mensagemErroInscricao(`FORMULARIO_${f.situacao.toUpperCase()}`) };
  if (!(await dentroDoLimite(f.id, "upload", 15))) {
    return { ok: false, erro: "Muitos envios seguidos. Aguarde alguns minutos." };
  }

  const path = `${f.id}/${randomUUID()}/${tipo}-${Date.now()}.${EXTENSAO[mimeBase]}`;
  const { data, error } = await createAdminClient().storage.from("inscricoes").createSignedUploadUrl(path);
  if (error || !data) {
    console.error("falha ao gerar URL de upload", error);
    return { ok: false, erro: "Não foi possível preparar o envio. Tente novamente." };
  }
  return { ok: true, path, signedUrl: data.signedUrl };
}

/** Confere se os arquivos citados existem e pertencem a este formulário. */
async function arquivosValidos(formularioId: string, paths: string[]): Promise<boolean> {
  if (!paths.length) return true;
  const admin = createAdminClient().storage.from("inscricoes");
  for (const path of paths) {
    if (!path.startsWith(`${formularioId}/`)) return false;
    const pasta = path.slice(0, path.lastIndexOf("/"));
    const nome = path.slice(path.lastIndexOf("/") + 1);
    const { data, error } = await admin.list(pasta, { search: nome, limit: 1 });
    if (error || !data?.some((o) => o.name === nome)) return false;
  }
  return true;
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

  if (!(await arquivosValidos(f.id, arquivosDaInscricao(f.perguntas, respostas)))) {
    return { ok: false, erro: "Não encontramos a foto ou o vídeo enviado. Envie o arquivo de novo." };
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
