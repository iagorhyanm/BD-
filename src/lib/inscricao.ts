/**
 * Regras compartilhadas (navegador + servidor) do formulário de inscrição.
 */
import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { normalizarTelefone, telefoneValido } from "@/lib/telefone";
import { calcularIdade, hojeEmBelem } from "@/lib/datas";

export type TipoPergunta = Database["public"]["Enums"]["tipo_pergunta"];
export type StatusInscricao = Database["public"]["Enums"]["status_inscricao"];
export type Sexo = Database["public"]["Enums"]["sexo"];

export type Pergunta = {
  id: string;
  tipo: TipoPergunta;
  rotulo: string;
  ajuda: string | null;
  opcoes: string[];
  obrigatoria: boolean;
};

export type Resposta = string | string[] | number | null;

export const TIPOS_PERGUNTA: { valor: TipoPergunta; rotulo: string; temOpcoes: boolean }[] = [
  { valor: "texto_curto", rotulo: "Texto curto", temOpcoes: false },
  { valor: "texto_longo", rotulo: "Texto longo", temOpcoes: false },
  { valor: "multipla", rotulo: "Múltipla escolha (uma opção)", temOpcoes: true },
  { valor: "caixas", rotulo: "Caixas de seleção (várias opções)", temOpcoes: true },
  { valor: "lista", rotulo: "Lista suspensa", temOpcoes: true },
  { valor: "sim_nao", rotulo: "Sim / Não", temOpcoes: false },
  { valor: "escala", rotulo: "Escala de 1 a 5", temOpcoes: false },
  { valor: "foto", rotulo: "Foto (upload)", temOpcoes: false },
  { valor: "video", rotulo: "Vídeo (upload ou link)", temOpcoes: false },
];

/* ------------------------------------------------------------------ */
/* Arquivos (foto/vídeo)                                               */
/* ------------------------------------------------------------------ */

/** Limite por arquivo do plano gratuito do Supabase. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_FOTO_BYTES = 5 * 1024 * 1024;
export const TIPOS_VIDEO = ["video/mp4", "video/quicktime", "video/webm", "video/3gpp", "video/x-matroska"];
export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"];

/** Caminho no bucket: <formulario>/<aleatorio>/<foto|video>-<timestamp>.<ext> */
export const REGEX_ARQUIVO = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/(foto|video)-\d+\.[a-z0-9]{2,5}$/;
const PREFIXO_ARQUIVO = "arquivo:";

/** Resposta de vídeo: "arquivo:<caminho>" (upload) ou a URL do link. */
export function lerVideo(v: unknown): { tipo: "arquivo"; path: string } | { tipo: "link"; url: string } | null {
  if (typeof v !== "string" || !v) return null;
  if (v.startsWith(PREFIXO_ARQUIVO)) return { tipo: "arquivo", path: v.slice(PREFIXO_ARQUIVO.length) };
  return { tipo: "link", url: v };
}
export const respostaVideoArquivo = (path: string) => `${PREFIXO_ARQUIVO}${path}`;

/** Caminhos de arquivos (no bucket) citados nas respostas de uma inscrição. */
export function arquivosDaInscricao(perguntas: Pick<Pergunta, "id" | "tipo">[], respostas: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const p of perguntas) {
    const v = respostas[p.id];
    if (p.tipo === "foto" && typeof v === "string" && REGEX_ARQUIVO.test(v)) out.push(v);
    if (p.tipo === "video") {
      const vid = lerVideo(v);
      if (vid?.tipo === "arquivo" && REGEX_ARQUIVO.test(vid.path)) out.push(vid.path);
    }
  }
  return out;
}

export function linkValido(url: string): boolean {
  try {
    const u = new URL(url);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

export const tipoTemOpcoes = (t: TipoPergunta) => TIPOS_PERGUNTA.find((x) => x.valor === t)?.temOpcoes ?? false;
export const rotuloTipo = (t: TipoPergunta) => TIPOS_PERGUNTA.find((x) => x.valor === t)?.rotulo ?? t;

export const STATUS: { valor: StatusInscricao; rotulo: string; classe: string }[] = [
  { valor: "pendente", rotulo: "Pendente", classe: "bg-muted text-foreground" },
  { valor: "em_analise", rotulo: "Em análise", classe: "bg-sky-100 text-sky-900" },
  { valor: "selecionado", rotulo: "Selecionado", classe: "bg-emerald-100 text-emerald-900" },
  { valor: "lista_espera", rotulo: "Lista de espera", classe: "bg-amber-100 text-amber-900" },
  { valor: "nao_selecionado", rotulo: "Não selecionado", classe: "bg-rose-100 text-rose-900" },
];

export const rotuloStatus = (s: StatusInscricao) => STATUS.find((x) => x.valor === s)?.rotulo ?? s;
export const classeStatus = (s: StatusInscricao) => STATUS.find((x) => x.valor === s)?.classe ?? "";

export const ROTULO_SEXO: Record<Sexo, string> = { masculino: "Masculino", feminino: "Feminino" };

/** Formata uma resposta para exibição/CSV. */
export function formatarResposta(p: Pick<Pergunta, "tipo">, v: Resposta | undefined): string {
  if (v === null || v === undefined || v === "") return "";
  if (Array.isArray(v)) return v.join(", ");
  if (p.tipo === "foto") return "Foto enviada";
  if (p.tipo === "video") {
    const vid = lerVideo(v);
    return vid?.tipo === "link" ? vid.url : "Vídeo enviado (arquivo)";
  }
  if (p.tipo === "sim_nao") return v === "sim" ? "Sim" : v === "nao" ? "Não" : String(v);
  return String(v);
}

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

/** Valida uma resposta de pergunta personalizada. Retorna a mensagem de erro ou null. */
export function validarResposta(p: Pergunta, v: Resposta | undefined): string | null {
  const vazio =
    v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
  if (vazio) {
    if (!p.obrigatoria && p.tipo !== "foto" && p.tipo !== "video") return null;
    if (p.tipo === "foto") return "Envie a sua selfie.";
    if (p.tipo === "video") return "Envie o vídeo cantando ou cole o link.";
    return "Resposta obrigatória.";
  }

  switch (p.tipo) {
    case "texto_curto":
      return typeof v === "string" && v.length <= 300 ? null : "Resposta muito longa (máx. 300 caracteres).";
    case "texto_longo":
      return typeof v === "string" && v.length <= 3000 ? null : "Resposta muito longa (máx. 3000 caracteres).";
    case "multipla":
    case "lista":
      return typeof v === "string" && p.opcoes.includes(v) ? null : "Escolha uma das opções.";
    case "caixas":
      return Array.isArray(v) && v.every((x) => p.opcoes.includes(x)) ? null : "Opção inválida.";
    case "sim_nao":
      return v === "sim" || v === "nao" ? null : "Responda sim ou não.";
    case "escala":
      return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5 ? null : "Escolha de 1 a 5.";
    case "foto":
      return typeof v === "string" && REGEX_ARQUIVO.test(v) ? null : "Envie a foto.";
    case "video": {
      const vid = lerVideo(v);
      if (!vid) return "Envie o vídeo ou cole o link.";
      if (vid.tipo === "arquivo") return REGEX_ARQUIVO.test(vid.path) ? null : "Envie o vídeo novamente.";
      return linkValido(vid.url) && vid.url.length <= 500 ? null : "Cole um link válido (começando com https://).";
    }
  }
}

const anoAtual = () => Number(hojeEmBelem().slice(0, 4));

export const camposFixosSchema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(3, "Informe o nome completo.")
      .max(120, "Nome muito longo.")
      .refine((v) => v.includes(" "), "Informe nome e sobrenome."),
    nascimento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de nascimento.")
      .refine((v) => {
        const idade = calcularIdade(v);
        return v <= hojeEmBelem() && idade >= 5 && idade <= 120;
      }, "Data de nascimento inválida."),
    telefone: z
      .string()
      .transform(normalizarTelefone)
      .refine(telefoneValido, "Telefone inválido. Use DDD + número."),
    sexo: z.enum(["masculino", "feminino"], { message: "Selecione o sexo." }),
    ja_trabalhou: z.enum(["sim", "nao"], { message: "Responda se já trabalhou no EJC." }),
    equipe_anterior: z.string().trim().max(120).optional(),
    ano_anterior: z.string().trim().optional(),
    cidade: z.string().trim().min(2, "Informe a cidade.").max(80),
    consentimento: z.literal("on", { message: "É preciso aceitar o termo de consentimento." }),
    resp_nome: z.string().trim().max(120).optional(),
    resp_telefone: z.string().optional(),
    resp_consentimento: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.ja_trabalhou === "sim") {
      if (!d.equipe_anterior)
        ctx.addIssue({ code: "custom", path: ["equipe_anterior"], message: "Informe em qual equipe." });
      const ano = Number(d.ano_anterior);
      if (!d.ano_anterior || !Number.isInteger(ano) || ano < 1980 || ano > anoAtual())
        ctx.addIssue({ code: "custom", path: ["ano_anterior"], message: "Informe o ano (ex.: 2025)." });
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.nascimento) && calcularIdade(d.nascimento) < 18) {
      if (!d.resp_nome || d.resp_nome.length < 3)
        ctx.addIssue({ code: "custom", path: ["resp_nome"], message: "Informe o nome do responsável." });
      if (!telefoneValido(d.resp_telefone))
        ctx.addIssue({ code: "custom", path: ["resp_telefone"], message: "Informe o telefone do responsável." });
      if (d.resp_consentimento !== "on")
        ctx.addIssue({
          code: "custom",
          path: ["resp_consentimento"],
          message: "O responsável precisa autorizar.",
        });
    }
  });

export type CamposFixos = z.infer<typeof camposFixosSchema>;

/** Traduz erros do banco (trigger) para mensagens amigáveis. */
export function mensagemErroInscricao(msg: string | undefined, code?: string): string {
  if (code === "23505") return "Já existe uma inscrição com este telefone neste formulário.";
  if (!msg) return "Não foi possível enviar. Tente novamente.";
  if (msg.includes("FORMULARIO_ESGOTADO")) return "As vagas de inscrição acabaram. 😕";
  if (msg.includes("FORMULARIO_ENCERRADO")) return "As inscrições foram encerradas.";
  if (msg.includes("FORMULARIO_AGENDADO")) return "As inscrições ainda não abriram.";
  if (msg.includes("FORMULARIO_FECHADO")) return "As inscrições estão fechadas.";
  if (msg.includes("RESPONSAVEL_OBRIGATORIO")) return "Preencha os dados do responsável.";
  if (msg.includes("PERGUNTA_OBRIGATORIA")) return "Responda todas as perguntas obrigatórias.";
  if (msg.includes("NASCIMENTO_INVALIDO")) return "Data de nascimento inválida.";
  return "Não foi possível enviar. Tente novamente.";
}

/** Gera slug a partir do título: "Inscrição Bandinha 2027" → "inscricao-bandinha-2027". */
export function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/* ------------------------------------------------------------------ */
/* Situação do formulário (mesma regra da função SQL)                  */
/* ------------------------------------------------------------------ */

export type Situacao = "aberto" | "fechado" | "agendado" | "encerrado" | "esgotado";

export function situacaoFormulario(
  f: { aberto: boolean; abre_em: string | null; fecha_em: string | null; limite: number | null },
  total: number,
  agora = new Date(),
): Situacao {
  if (!f.aberto) return "fechado";
  if (f.abre_em && agora < new Date(f.abre_em)) return "agendado";
  if (f.fecha_em && agora >= new Date(f.fecha_em)) return "encerrado";
  if (f.limite !== null && total >= f.limite) return "esgotado";
  return "aberto";
}

export const ROTULO_SITUACAO: Record<Situacao, { rotulo: string; classe: string }> = {
  aberto: { rotulo: "Recebendo inscrições", classe: "bg-emerald-100 text-emerald-900" },
  fechado: { rotulo: "Fechado", classe: "bg-muted text-foreground" },
  agendado: { rotulo: "Agendado", classe: "bg-sky-100 text-sky-900" },
  encerrado: { rotulo: "Encerrado", classe: "bg-muted text-foreground" },
  esgotado: { rotulo: "Limite atingido", classe: "bg-amber-100 text-amber-900" },
};
