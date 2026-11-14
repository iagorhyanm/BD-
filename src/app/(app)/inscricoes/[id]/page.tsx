import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { urlCapa } from "@/lib/supabase/publico";
import { ROTULO_SITUACAO, situacaoFormulario, type Pergunta } from "@/lib/inscricao";
import { urlBase } from "@/lib/url";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { PainelCompartilhar } from "@/components/compartilhar-link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorPerguntas } from "./editor-perguntas";
import { ConfigFormulario } from "./config-formulario";
import { AberturaFormulario } from "./abertura-formulario";

export const metadata: Metadata = { title: "Editar formulário" };

export default async function FormularioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: f }, { data: perguntas }, { count }, { data: edicao }, base] = await Promise.all([
    supabase.from("formularios").select("*").eq("id", id).maybeSingle(),
    supabase.from("perguntas").select("*").eq("formulario_id", id).order("ordem").order("criado_em"),
    supabase.from("inscricoes").select("id", { count: "exact", head: true }).eq("formulario_id", id),
    supabase.from("formularios").select("edicoes(texto_lgpd)").eq("id", id).maybeSingle(),
    urlBase(),
  ]);
  if (!f) notFound();

  const total = count ?? 0;
  const situacao = situacaoFormulario(f, total);
  const url = `${base}/inscricao/${f.slug}`;
  const lgpdEdicao = (edicao?.edicoes as { texto_lgpd: string } | null)?.texto_lgpd ?? "";

  return (
    <>
      <CabecalhoPagina
        titulo={f.titulo}
        voltar={{ href: "/inscricoes", rotulo: "Inscrições" }}
        descricao={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROTULO_SITUACAO[situacao].classe}`}>
              {ROTULO_SITUACAO[situacao].rotulo}
            </span>
            {total} {total === 1 ? "inscrição" : "inscrições"}
          </span>
        }
      />

      <AberturaFormulario id={f.id} aberto={f.aberto} situacao={situacao} />

      <Tabs defaultValue="perguntas" className="mt-5">
        <TabsList className="grid h-11 w-full grid-cols-3">
          <TabsTrigger value="perguntas">Perguntas</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
          <TabsTrigger value="compartilhar">Compartilhar</TabsTrigger>
        </TabsList>
        <TabsContent value="perguntas" className="mt-4">
          <EditorPerguntas
            formularioId={f.id}
            temInscricoes={total > 0}
            iniciais={(perguntas ?? []).map(
              (p): Pergunta => ({
                id: p.id,
                tipo: p.tipo,
                rotulo: p.rotulo,
                ajuda: p.ajuda,
                opcoes: (p.opcoes as string[]) ?? [],
                obrigatoria: p.obrigatoria,
              }),
            )}
          />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          <ConfigFormulario formulario={f} capaUrl={urlCapa(f.capa_path)} lgpdEdicao={lgpdEdicao} podeExcluir={total === 0} />
        </TabsContent>
        <TabsContent value="compartilhar" className="mt-4">
          <div className="rounded-xl border bg-card p-4">
            <PainelCompartilhar url={url} titulo={f.titulo} />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
