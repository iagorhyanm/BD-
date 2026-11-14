"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireStaff, type Resultado } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import { deBelem } from "@/lib/datas";

const equipSchema = z
  .object({
    item: z.string().trim().min(1, "Informe o item.").max(150),
    categoria: z.string().trim().max(60).optional(),
    quantidade: z.coerce.number().int("Quantidade inválida.").min(0, "Quantidade inválida."),
    dono_tipo: z.enum(["equipe", "emprestado"]),
    dono_nome: z.string().trim().max(120).optional(),
    estado: z.enum(["bom", "defeito", "manutencao"]),
    responsavel: z.string().trim().max(120).optional(),
    observacoes: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.dono_tipo === "equipe" || !!d.dono_nome, { message: "Informe de quem foi emprestado." });

function revalidar(id?: string) {
  revalidatePath("/equipamentos");
  if (id) revalidatePath(`/equipamentos/${id}`);
  revalidatePath("/");
}

export async function salvarEquipamento(id: string | null, formData: FormData): Promise<Resultado<{ id: string }>> {
  await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) return falha("Crie uma edição primeiro.");
  const p = equipSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return falha(p.error.issues[0].message);
  const d = p.data;
  const linha = {
    item: d.item,
    categoria: d.categoria || null,
    quantidade: d.quantidade,
    dono_tipo: d.dono_tipo,
    dono_nome: d.dono_tipo === "emprestado" ? d.dono_nome! : d.dono_nome || null,
    estado: d.estado,
    responsavel: d.responsavel || null,
    observacoes: d.observacoes || null,
  };
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("equipamentos").update(linha).eq("id", id);
    if (error) return falha("Não foi possível salvar.");
    revalidar(id);
    return { ok: true, dados: { id } };
  }
  const { data, error } = await supabase
    .from("equipamentos")
    .insert({ ...linha, edicao_id: edicao.id })
    .select("id")
    .single();
  if (error) return falha("Não foi possível cadastrar.");
  revalidar(data.id);
  return { ok: true, dados: { id: data.id } };
}

export async function salvarFotoEquipamento(id: string, path: string | null): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { data: atual } = await supabase.from("equipamentos").select("foto_path, edicao_id").eq("id", id).single();
  const { error } = await supabase.from("equipamentos").update({ foto_path: path }).eq("id", id);
  if (error) return falha("Não foi possível salvar a foto.");
  // Só apaga o arquivo antigo se nenhum outro equipamento (ex.: cópia de outra edição) o usa.
  if (atual?.foto_path && atual.foto_path !== path) {
    const { count } = await supabase
      .from("equipamentos")
      .select("id", { count: "exact", head: true })
      .eq("foto_path", atual.foto_path);
    if (!count) await supabase.storage.from("equipamentos").remove([atual.foto_path]);
  }
  revalidar(id);
  return { ok: true };
}

export async function excluirEquipamento(id: string): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { data: atual } = await supabase.from("equipamentos").select("foto_path").eq("id", id).single();
  const { error } = await supabase.from("equipamentos").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir.");
  if (atual?.foto_path) {
    const { count } = await supabase
      .from("equipamentos")
      .select("id", { count: "exact", head: true })
      .eq("foto_path", atual.foto_path);
    if (!count) await supabase.storage.from("equipamentos").remove([atual.foto_path]);
  }
  revalidar();
  return { ok: true };
}

/* ---------------------------- Empréstimos ---------------------------- */

const retiradaSchema = z.object({
  quem: z.string().trim().min(2, "Informe quem pegou.").max(120),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Informe a hora."),
  observacao: z.string().trim().max(500).optional(),
});

export async function registrarRetirada(equipamentoId: string, formData: FormData): Promise<Resultado> {
  const eu = await requireStaff();
  const p = retiradaSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return falha(p.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.from("emprestimos").insert({
    equipamento_id: equipamentoId,
    quem: p.data.quem,
    retirado_em: deBelem(p.data.data, p.data.hora).toISOString(),
    observacao: p.data.observacao || null,
    registrado_por: eu.id,
  });
  if (error) return falha("Não foi possível registrar a retirada.");
  revalidar(equipamentoId);
  return { ok: true };
}

export async function registrarDevolucao(emprestimoId: string, equipamentoId: string): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("emprestimos")
    .update({ devolvido_em: new Date().toISOString() })
    .eq("id", emprestimoId)
    .is("devolvido_em", null);
  if (error) return falha("Não foi possível registrar a devolução.");
  revalidar(equipamentoId);
  return { ok: true };
}

/* ----------------------------- Checklist ----------------------------- */

function revalidarEvento(eventoId: string) {
  revalidatePath(`/agenda/${eventoId}`);
}

export async function adicionarAoChecklist(
  eventoId: string,
  itens: { equipamento_id?: string | null; descricao: string; quantidade?: number }[],
): Promise<Resultado> {
  await requireStaff();
  const p = z
    .array(
      z.object({
        equipamento_id: z.string().uuid().nullable().optional(),
        descricao: z.string().trim().min(1, "Descreva o item.").max(200),
        quantidade: z.number().int().min(1).max(999).optional(),
      }),
    )
    .min(1)
    .max(200)
    .safeParse(itens);
  if (!p.success) return falha(p.error.issues[0].message);
  const supabase = await createClient();
  const { count } = await supabase.from("checklist_itens").select("id", { count: "exact", head: true }).eq("evento_id", eventoId);
  const { error } = await supabase.from("checklist_itens").insert(
    p.data.map((i, k) => ({
      evento_id: eventoId,
      equipamento_id: i.equipamento_id ?? null,
      descricao: i.descricao,
      quantidade: i.quantidade ?? 1,
      ordem: (count ?? 0) + k,
    })),
  );
  if (error) return falha("Não foi possível adicionar.");
  revalidarEvento(eventoId);
  return { ok: true };
}

export async function marcarConferido(id: string, eventoId: string, conferido: boolean): Promise<Resultado> {
  const eu = await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase
    .from("checklist_itens")
    .update({ conferido, conferido_por: conferido ? eu.id : null, conferido_em: conferido ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return falha("Não foi possível atualizar.");
  revalidarEvento(eventoId);
  return { ok: true };
}

export async function removerDoChecklist(id: string, eventoId: string): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("checklist_itens").delete().eq("id", id);
  if (error) return falha("Não foi possível remover.");
  revalidarEvento(eventoId);
  return { ok: true };
}
