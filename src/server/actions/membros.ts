"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { falha, requireStaff, type Resultado } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import { normalizarTelefone, telefoneValido } from "@/lib/telefone";
import { calcularIdade } from "@/lib/datas";

const membroSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(120),
  sexo: z.enum(["masculino", "feminino"], { message: "Selecione o sexo." }),
  nascimento: z
    .string()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida."),
  idade: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 5 && v <= 120), "Idade inválida."),
  telefone: z
    .string()
    .optional()
    .transform((v) => (v ? normalizarTelefone(v) : null))
    .refine((v) => v === null || telefoneValido(v), "Telefone inválido."),
  cidade: z.string().trim().max(80).optional(),
  nivel: z
    .enum(["iniciante", "intermediario", "avancado", ""])
    .optional()
    .transform((v) => (v ? v : null)),
  observacoes: z.string().trim().max(2000).optional(),
  ativo: z.string().optional(),
});

function revalidar(id?: string) {
  revalidatePath("/membros");
  if (id) revalidatePath(`/membros/${id}`);
  revalidatePath("/");
}

export async function salvarMembro(id: string | null, formData: FormData): Promise<Resultado<{ id: string }>> {
  await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) return falha("Crie uma edição antes de cadastrar membros.");

  const parsed = membroSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return falha(parsed.error.issues[0].message);
  const d = parsed.data;
  const funcoes = z.array(z.string().uuid()).safeParse(formData.getAll("funcoes"));
  if (!funcoes.success) return falha("Funções inválidas.");

  const linha = {
    nome: d.nome,
    sexo: d.sexo,
    nascimento: d.nascimento,
    idade: d.nascimento ? calcularIdade(d.nascimento) : d.idade,
    telefone: d.telefone,
    cidade: d.cidade || null,
    nivel: d.nivel,
    observacoes: d.observacoes || null,
    ativo: d.ativo === "on",
  };

  const supabase = await createClient();
  let membroId = id;
  if (id) {
    const { error } = await supabase.from("membros").update(linha).eq("id", id);
    if (error) return falha("Não foi possível salvar.");
  } else {
    const { data, error } = await supabase
      .from("membros")
      .insert({ ...linha, edicao_id: edicao.id })
      .select("id")
      .single();
    if (error) return falha("Não foi possível cadastrar.");
    membroId = data.id;
  }

  // Substitui as funções do membro.
  await supabase.from("membro_funcoes").delete().eq("membro_id", membroId!);
  if (funcoes.data.length) {
    const { error } = await supabase
      .from("membro_funcoes")
      .insert(funcoes.data.map((f) => ({ membro_id: membroId!, funcao_id: f })));
    if (error) return falha("Membro salvo, mas houve erro ao salvar as funções.");
  }

  revalidar(membroId!);
  return { ok: true, dados: { id: membroId! } };
}

export async function excluirMembro(id: string): Promise<Resultado> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("membros").delete().eq("id", id);
  if (error) return falha("Não foi possível excluir.");
  revalidar();
  return { ok: true };
}
