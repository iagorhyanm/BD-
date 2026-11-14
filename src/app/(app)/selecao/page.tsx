import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import type { Pergunta } from "@/lib/inscricao";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { SemEdicao } from "@/components/sem-edicao";
import { ListaSelecao, type InscritoLista } from "./lista-selecao";

export const metadata: Metadata = { title: "Seleção" };

export default async function SelecaoPage({ searchParams }: { searchParams: Promise<{ formulario?: string; aba?: string }> }) {
  const eu = await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) return <SemEdicao titulo="Seleção" />;
  const { formulario, aba } = await searchParams;

  const supabase = await createClient();
  const [{ data: formularios }, { data: inscricoes }] = await Promise.all([
    supabase
      .from("formularios")
      .select("id, titulo, perguntas(id, tipo, rotulo, ajuda, opcoes, obrigatoria, ordem)")
      .eq("edicao_id", edicao.id)
      .order("criado_em"),
    supabase
      .from("inscricoes")
      .select(
        "id, formulario_id, nome, idade, nascimento, telefone, sexo, cidade, ja_trabalhou, equipe_anterior, ano_anterior, respostas, status, criado_em, resp_nome, resp_telefone, avaliacoes(nota, coordenador_id), membros(id)",
      )
      .eq("edicao_id", edicao.id)
      .order("criado_em", { ascending: false }),
  ]);

  const forms = (formularios ?? []).map((f) => ({
    id: f.id,
    titulo: f.titulo,
    perguntas: [...(f.perguntas ?? [])]
      .sort((a, b) => a.ordem - b.ordem)
      .map(
        (p): Pergunta => ({
          id: p.id,
          tipo: p.tipo,
          rotulo: p.rotulo,
          ajuda: p.ajuda,
          opcoes: (p.opcoes as string[]) ?? [],
          obrigatoria: p.obrigatoria,
        }),
      ),
  }));

  // Miniaturas das selfies (URLs temporárias do bucket privado).
  const perguntaFoto = new Map(forms.flatMap((f) => f.perguntas.filter((p) => p.tipo === "foto").map((p) => [f.id, p.id] as const)));
  const caminhosFoto = new Map<string, string>();
  for (const i of inscricoes ?? []) {
    const pid = perguntaFoto.get(i.formulario_id);
    const v = pid ? (i.respostas as Record<string, unknown> | null)?.[pid] : null;
    if (typeof v === "string") caminhosFoto.set(i.id, v);
  }
  const urlFoto = new Map<string, string>();
  if (caminhosFoto.size) {
    const { data } = await supabase.storage.from("inscricoes").createSignedUrls([...new Set(caminhosFoto.values())], 3600);
    const porCaminho = new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl]));
    for (const [id, c] of caminhosFoto) if (porCaminho.get(c)) urlFoto.set(id, porCaminho.get(c)!);
  }

  const lista: InscritoLista[] = (inscricoes ?? []).map((i) => {
    const notas = (i.avaliacoes ?? []).map((a) => a.nota);
    const membro = Array.isArray(i.membros) ? i.membros[0] : i.membros;
    return {
      id: i.id,
      formulario_id: i.formulario_id,
      nome: i.nome,
      idade: i.idade,
      nascimento: i.nascimento,
      telefone: i.telefone,
      sexo: i.sexo,
      cidade: i.cidade,
      ja_trabalhou: i.ja_trabalhou,
      equipe_anterior: i.equipe_anterior,
      ano_anterior: i.ano_anterior,
      respostas: (i.respostas ?? {}) as Record<string, unknown>,
      status: i.status,
      criado_em: i.criado_em,
      resp_nome: i.resp_nome,
      resp_telefone: i.resp_telefone,
      media: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null,
      qtdAvaliacoes: notas.length,
      avalieiEu: (i.avaliacoes ?? []).some((a) => a.coordenador_id === eu.id),
      naEquipe: !!membro,
      foto: urlFoto.get(i.id) ?? null,
    };
  });

  return (
    <>
      <CabecalhoPagina titulo="Seleção" descricao={`Inscritos de ${edicao.nome}.`} />
      <ListaSelecao
        inscritos={lista}
        formularios={forms}
        vagas={{ masculino: edicao.vagas_masculino, feminino: edicao.vagas_feminino }}
        nomeEdicao={edicao.nome}
        formularioInicial={formulario}
        abaInicial={aba === "feminino" ? "feminino" : "masculino"}
      />
    </>
  );
}
