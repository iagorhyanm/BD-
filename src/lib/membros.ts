import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Funcao } from "@/lib/dominio";
import { calcularIdade } from "@/lib/datas";

/** Lista de funções (vozes/instrumentos), em ordem. */
export const listarFuncoes = cache(async (incluirInativas = false): Promise<Funcao[]> => {
  const supabase = await createClient();
  let q = supabase.from("funcoes").select("id, nome, tipo, ordem, ativo").order("ordem").order("nome");
  if (!incluirInativas) q = q.eq("ativo", true);
  const { data } = await q;
  return data ?? [];
});

export type MembroResumo = {
  id: string;
  nome: string;
  sexo: "masculino" | "feminino";
  idade: number | null;
  telefone: string | null;
  cidade: string | null;
  nivel: "iniciante" | "intermediario" | "avancado" | null;
  ativo: boolean;
  observacoes: string | null;
  funcoes: string[];
};

/** Membros de uma edição com as funções (ids). */
export async function listarMembros(edicaoId: string, apenasAtivos = false): Promise<MembroResumo[]> {
  const supabase = await createClient();
  let q = supabase
    .from("membros")
    .select("id, nome, sexo, idade, nascimento, telefone, cidade, nivel, ativo, observacoes, membro_funcoes(funcao_id)")
    .eq("edicao_id", edicaoId)
    .order("nome");
  if (apenasAtivos) q = q.eq("ativo", true);
  const { data } = await q;
  return (data ?? []).map((m) => ({
    id: m.id,
    nome: m.nome,
    sexo: m.sexo,
    idade: m.nascimento ? calcularIdade(m.nascimento) : m.idade,
    telefone: m.telefone,
    cidade: m.cidade,
    nivel: m.nivel,
    ativo: m.ativo,
    observacoes: m.observacoes,
    funcoes: (m.membro_funcoes ?? []).map((f) => f.funcao_id),
  }));
}

