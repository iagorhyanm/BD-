"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { falha, requireStaff, type Resultado } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import { deBelem } from "@/lib/datas";
import { slugificar, tipoTemOpcoes, type TipoPergunta } from "@/lib/inscricao";

const sufixo = () => randomBytes(3).toString("hex").slice(0, 4);

/** Perguntas que todo formulário novo já traz. */
const PERGUNTAS_PADRAO = [
  {
    tipo: "foto" as const,
    rotulo: "Selfie",
    ajuda: "Uma selfie de frente, com boa luz, em que o seu rosto apareça claramente (sem óculos escuros, boné ou filtro).",
    obrigatoria: true,
  },
  {
    tipo: "video" as const,
    rotulo: "Vídeo cantando “Só Podia Ser Jesus”",
    ajuda: "Grave você cantando a música “Só Podia Ser Jesus” (pode ser um trecho de até 1 minuto). Envie o arquivo (até 50 MB) ou cole o link do YouTube, Google Drive ou Instagram.",
    obrigatoria: true,
  },
];

/** Foto e vídeo são sempre obrigatórios. */
const sempreObrigatoria = (tipo: string) => tipo === "foto" || tipo === "video";

function revalidar(id?: string) {
  revalidatePath("/inscricoes");
  if (id) revalidatePath(`/inscricoes/${id}`);
}

export async function criarFormulario() {
  const eu = await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) redirect("/inscricoes");

  const titulo = `Inscrições Bandinha · ${edicao.nome}`;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("formularios")
    .insert({
      edicao_id: edicao.id,
      titulo,
      slug: `${slugificar(`bandinha ${edicao.nome}`)}-${sufixo()}`,
      descricao:
        "Quer servir a Deus com a música no EJC? Preencha a inscrição para a Bandinha. 🎸🎤",
      criado_por: eu.id,
    })
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível criar o formulário.");

  // Formulário já pronto: selfie e vídeo cantando (obrigatórios).
  await supabase.from("perguntas").insert(
    PERGUNTAS_PADRAO.map((p, ordem) => ({ ...p, formulario_id: data.id, ordem, opcoes: [] })),
  );

  revalidar();
  redirect(`/inscricoes/${data.id}`);
}

/* --------------------------- Configurações --------------------------- */

const dataHoraLocal = z
  .string()
  .optional()
  .transform((v) => {
    if (!v) return null;
    const [data, hora] = v.split("T");
    return deBelem(data, (hora ?? "00:00").slice(0, 5)).toISOString();
  });

const configSchema = z
  .object({
    titulo: z.string().trim().min(3, "Informe o título.").max(120),
    descricao: z.string().trim().max(2000).optional(),
    slug: z
      .string()
      .trim()
      .transform(slugificar)
      .refine((v) => v.length >= 3, "O link precisa ter pelo menos 3 letras/números."),
    abre_em: dataHoraLocal,
    fecha_em: dataHoraLocal,
    limite: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .refine((v) => v === null || (Number.isInteger(v) && v > 0), "Limite inválido."),
    msg_confirmacao: z.string().trim().min(3, "Escreva a mensagem de confirmação.").max(1000),
    texto_lgpd: z.string().trim().max(3000).optional(),
  })
  .refine((d) => !d.abre_em || !d.fecha_em || d.abre_em < d.fecha_em, {
    message: "A data de fechamento precisa ser depois da abertura.",
  });

export async function salvarConfiguracoes(id: string, formData: FormData): Promise<Resultado> {
  await requireStaff();
  const parsed = configSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falha(parsed.error.issues[0].message);

  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("formularios")
    .update({
      titulo: d.titulo,
      descricao: d.descricao || null,
      slug: d.slug,
      abre_em: d.abre_em,
      fecha_em: d.fecha_em,
      limite: d.limite,
      msg_confirmacao: d.msg_confirmacao,
      texto_lgpd: d.texto_lgpd || null,
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return falha("Esse link já está em uso por outro formulário.");
    return falha("Não foi possível salvar.");
  }
  revalidar(id);
  return { ok: true };
}

export async function alternarAberto(id: string, aberto: boolean): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("formularios").update({ aberto }).eq("id", id);
  if (error) return falha("Não foi possível alterar.");
  revalidar(id);
  return { ok: true };
}

export async function salvarCapa(id: string, path: string | null): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { data: atual } = await supabase.from("formularios").select("capa_path").eq("id", id).single();
  const { error } = await supabase.from("formularios").update({ capa_path: path }).eq("id", id);
  if (error) return falha("Não foi possível salvar a capa.");
  if (atual?.capa_path && atual.capa_path !== path) {
    await supabase.storage.from("capas").remove([atual.capa_path]);
  }
  revalidar(id);
  return { ok: true };
}

export async function excluirFormulario(id: string): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { count } = await supabase
    .from("inscricoes")
    .select("id", { count: "exact", head: true })
    .eq("formulario_id", id);
  if ((count ?? 0) > 0) {
    return falha("Este formulário já tem inscrições. Feche-o em vez de excluir.");
  }
  const { data: f } = await supabase.from("formularios").select("capa_path").eq("id", id).single();
  const { error } = await supabase.from("formularios").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir.");
  if (f?.capa_path) await supabase.storage.from("capas").remove([f.capa_path]);
  revalidar();
  return { ok: true };
}

/* ----------------------------- Perguntas ----------------------------- */

const TIPOS = ["texto_curto", "texto_longo", "multipla", "caixas", "sim_nao", "escala", "lista", "foto", "video"] as const;

const perguntaSchema = z
  .object({
    id: z.string(),
    tipo: z.enum(TIPOS),
    rotulo: z.string().trim().min(1, "Toda pergunta precisa de um título.").max(300),
    ajuda: z.string().trim().max(500).nullable().optional(),
    opcoes: z.array(z.string().trim().min(1, "Há uma opção em branco.").max(200)).max(50),
    obrigatoria: z.boolean(),
  })
  .superRefine((p, ctx) => {
    if (tipoTemOpcoes(p.tipo as TipoPergunta)) {
      if (p.opcoes.length < 2)
        ctx.addIssue({ code: "custom", message: `“${p.rotulo}” precisa de pelo menos 2 opções.` });
      if (new Set(p.opcoes).size !== p.opcoes.length)
        ctx.addIssue({ code: "custom", message: `“${p.rotulo}” tem opções repetidas.` });
    }
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function salvarPerguntas(formularioId: string, perguntas: unknown): Promise<Resultado> {
  await requireStaff();
  const parsed = z.array(perguntaSchema).max(60, "Máximo de 60 perguntas.").safeParse(perguntas);
  if (!parsed.success) return falha(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data: existentes } = await supabase.from("perguntas").select("id").eq("formulario_id", formularioId);
  const idsExistentes = new Set((existentes ?? []).map((p) => p.id));

  const linhas = parsed.data.map((p, ordem) => ({
    ...(UUID.test(p.id) && idsExistentes.has(p.id) ? { id: p.id } : {}),
    formulario_id: formularioId,
    tipo: p.tipo,
    rotulo: p.rotulo,
    ajuda: p.ajuda || null,
    opcoes: tipoTemOpcoes(p.tipo as TipoPergunta) ? p.opcoes : [],
    obrigatoria: sempreObrigatoria(p.tipo) || p.obrigatoria,
    ordem,
  }));

  const mantidos = new Set(linhas.filter((l) => "id" in l).map((l) => (l as { id: string }).id));
  const removidos = [...idsExistentes].filter((id) => !mantidos.has(id));
  if (removidos.length) {
    const { error } = await supabase.from("perguntas").delete().in("id", removidos);
    if (error) return falha("Não foi possível remover perguntas.");
  }

  const atualizar = linhas.filter((l) => "id" in l);
  const inserir = linhas.filter((l) => !("id" in l));
  if (atualizar.length) {
    const { error } = await supabase.from("perguntas").upsert(atualizar);
    if (error) return falha("Não foi possível salvar as perguntas.");
  }
  if (inserir.length) {
    const { error } = await supabase.from("perguntas").insert(inserir);
    if (error) return falha("Não foi possível salvar as perguntas.");
  }

  revalidar(formularioId);
  return { ok: true };
}
