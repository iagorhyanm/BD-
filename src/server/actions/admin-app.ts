"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireAdmin, type Resultado } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarLogAdmin } from "@/lib/logs";
import { interpretarLeitura } from "@/lib/plano";
import { somarDias } from "@/lib/datas";
import planoCronologico from "@/data/plano-cronologico.json";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

function revalidarTudo() {
  revalidatePath("/", "layout");
}

/* ------------------------------- Textos e aviso ------------------------------- */

const configSchema = z.object({
  nome: z.string().trim().min(2, "Nome com pelo menos 2 letras.").max(40, "Nome com até 40 caracteres."),
  slogan: z.string().trim().max(120, "Slogan com até 120 caracteres."),
  boas_vindas: z.string().trim().max(300, "Boas-vindas com até 300 caracteres."),
  aviso_texto: z.string().trim().max(500, "Aviso com até 500 caracteres."),
  aviso_ativo: z.string().optional(),
});

export async function salvarConfig(formData: FormData): Promise<Resultado> {
  await requireAdmin();
  const p = configSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return falha(p.error.issues[0].message);
  const d = p.data;
  const ativo = d.aviso_ativo === "on" && !!d.aviso_texto;
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_config")
    .update({ nome: d.nome, slogan: d.slogan, boas_vindas: d.boas_vindas, aviso_texto: d.aviso_texto || null, aviso_ativo: ativo })
    .eq("id", 1);
  if (error) return falha("Não foi possível salvar.");
  revalidarTudo();
  return { ok: true };
}

/* ------------------------------- Plano de leitura ------------------------------ */

export type LinhaImportacao = { data: string; leitura: string; titulo?: string | null; texto?: string | null };

function validarLinha(l: LinhaImportacao) {
  if (!DATA.test(l.data)) return { erro: `Data inválida: ${l.data}` };
  const leitura = l.leitura.trim();
  if (!leitura || leitura.length > 300) return { erro: `${l.data}: leitura vazia ou longa demais` };
  const r = interpretarLeitura(leitura);
  if (r.erro) return { erro: `${l.data}: ${r.erro}` };
  return {
    linha: {
      data: l.data,
      leitura,
      referencias: r.referencias,
      titulo: l.titulo?.trim().slice(0, 150) || null,
      texto: l.texto?.trim().slice(0, 5000) || null,
    },
  };
}

function mensagemPlano(msg?: string) {
  if (msg?.includes("foreign key") || msg?.includes("checkins_data_plano_fkey")) {
    return "Esse dia já tem leituras marcadas e não pode ser removido.";
  }
  if (msg?.includes("REFERENCIA_INVALIDA")) return "Há uma referência bíblica inválida.";
  return "Não foi possível salvar o plano.";
}

export async function salvarDiaPlano(dataOriginal: string | null, formData: FormData): Promise<Resultado> {
  const ator = await requireAdmin();
  const v = validarLinha({
    data: String(formData.get("data") ?? ""),
    leitura: String(formData.get("leitura") ?? ""),
    titulo: String(formData.get("titulo") ?? ""),
    texto: String(formData.get("texto") ?? ""),
  });
  if (!v.linha) return falha(v.erro);
  const supabase = await createClient();
  if (dataOriginal) {
    // "on update cascade" leva junto as leituras já marcadas, se a data mudar.
    const { error } = await supabase.from("plano_dias").update(v.linha).eq("data", dataOriginal);
    if (error) return falha(error.code === "23505" ? "Já existe uma leitura nessa data." : mensagemPlano(error.message));
  } else {
    const { error } = await supabase.from("plano_dias").insert(v.linha);
    if (error) return falha(error.code === "23505" ? "Já existe uma leitura nessa data. Edite a que já existe." : mensagemPlano(error.message));
  }
  await registrarLogAdmin({ ator, acao: dataOriginal ? "editou o plano em" : "adicionou ao plano", entidade: "plano_dias", descricao: `${v.linha.data}: ${v.linha.leitura}` });
  revalidarTudo();
  return { ok: true };
}

export async function excluirDiaPlano(data: string): Promise<Resultado> {
  const ator = await requireAdmin();
  if (!DATA.test(data)) return falha("Data inválida.");
  const supabase = await createClient();
  const { error } = await supabase.from("plano_dias").delete().eq("data", data);
  if (error) return falha(mensagemPlano(error.message));
  await registrarLogAdmin({ ator, acao: "removeu do plano", entidade: "plano_dias", descricao: data });
  revalidarTudo();
  return { ok: true };
}

/** Grava várias linhas de uma vez (sobrescreve as datas que já existem). */
async function gravarLinhas(linhas: LinhaImportacao[], substituir: boolean): Promise<Resultado<{ gravados: number; removidos: number }>> {
  const validas = [];
  for (const l of linhas) {
    const v = validarLinha(l);
    if (!v.linha) return falha(v.erro);
    validas.push(v.linha);
  }
  if (!validas.length) return falha("Nenhuma linha para importar.");
  if (new Set(validas.map((l) => l.data)).size !== validas.length) return falha("Há datas repetidas na importação.");

  const supabase = await createClient();
  let removidos = 0;
  if (substituir) {
    // Remove os dias antigos que não estão na importação e ninguém marcou.
    const admin = createAdminClient();
    const { data: usadas } = await admin.from("checkins").select("data");
    const manter = new Set([...(usadas ?? []).map((u) => u.data), ...validas.map((l) => l.data)]);
    const { data: existentes } = await supabase.from("plano_dias").select("data");
    const remover = (existentes ?? []).map((e) => e.data).filter((d) => !manter.has(d));
    for (let i = 0; i < remover.length; i += 200) {
      const { error } = await supabase.from("plano_dias").delete().in("data", remover.slice(i, i + 200));
      if (error) return falha(mensagemPlano(error.message));
    }
    removidos = remover.length;
  }
  for (let i = 0; i < validas.length; i += 200) {
    const { error } = await supabase.from("plano_dias").upsert(validas.slice(i, i + 200), { onConflict: "data" });
    if (error) return falha(mensagemPlano(error.message));
  }
  revalidarTudo();
  return { ok: true, dados: { gravados: validas.length, removidos } };
}

export async function importarPlano(linhas: LinhaImportacao[], substituir: boolean): Promise<Resultado<{ gravados: number; removidos: number }>> {
  const ator = await requireAdmin();
  if (!Array.isArray(linhas) || linhas.length > 2000) return falha("Importação grande demais (máximo 2000 dias).");
  const r = await gravarLinhas(linhas, substituir);
  if (r.ok) await registrarLogAdmin({ ator, acao: "importou o plano", entidade: "plano_dias", descricao: `${r.dados.gravados} dias` });
  return r;
}

/** Monta o plano cronológico embutido (364 dias) a partir da data escolhida. */
export async function importarPlanoCronologico(inicio: string, substituir: boolean): Promise<Resultado<{ gravados: number; removidos: number; fim: string }>> {
  const ator = await requireAdmin();
  if (!DATA.test(inicio)) return falha("Escolha a data do Dia 1.");
  const linhas = planoCronologico.dias.map((d) => ({
    data: somarDias(inicio, d.dia - 1),
    leitura: d.leitura,
    titulo: `Semana ${String(d.semana).padStart(2, "0")} · Dia ${d.diaSemana}`,
  }));
  const r = await gravarLinhas(linhas, substituir);
  if (!r.ok) return r;
  const fim = linhas[linhas.length - 1].data;
  await registrarLogAdmin({ ator, acao: "importou o plano cronológico", entidade: "plano_dias", descricao: `${inicio} a ${fim}` });
  return { ok: true, dados: { ...r.dados, fim } };
}
