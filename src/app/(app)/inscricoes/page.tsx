import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import { ROTULO_SITUACAO, situacaoFormulario } from "@/lib/inscricao";
import { formatarDataHora } from "@/lib/datas";
import { urlBase } from "@/lib/url";
import { criarFormulario } from "@/server/actions/formularios";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { BotaoCopiar, BotaoQrCode } from "@/components/compartilhar-link";
import { SemEdicao } from "@/components/sem-edicao";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Inscrições" };

export default async function InscricoesPage() {
  await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) return <SemEdicao titulo="Inscrições" />;

  const supabase = await createClient();
  const [{ data: formularios }, base] = await Promise.all([
    supabase
      .from("formularios")
      .select("id, titulo, slug, aberto, abre_em, fecha_em, limite, criado_em, inscricoes(count)")
      .eq("edicao_id", edicao.id)
      .order("criado_em", { ascending: false }),
    urlBase(),
  ]);

  const botaoNovo = (
    <form action={criarFormulario}>
      <Button type="submit">
        <Plus /> Novo formulário
      </Button>
    </form>
  );

  return (
    <>
      <CabecalhoPagina
        titulo="Inscrições"
        descricao={`Formulários de inscrição de ${edicao.nome}.`}
        acoes={formularios?.length ? botaoNovo : undefined}
      />
      {!formularios?.length ? (
        <EstadoVazio
          icone={ClipboardList}
          titulo="Nenhum formulário ainda"
          descricao="Crie o formulário de inscrição e compartilhe o link (ou QR code) com os jovens."
          acao={botaoNovo}
        />
      ) : (
        <ul className="space-y-3">
          {formularios.map((f) => {
            const total = f.inscricoes?.[0]?.count ?? 0;
            const situacao = situacaoFormulario(f, total);
            const url = `${base}/inscricao/${f.slug}`;
            return (
              <li key={f.id} className="rounded-xl border bg-card">
                <Link href={`/inscricoes/${f.id}`} className="block rounded-t-xl p-4 hover:bg-muted/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROTULO_SITUACAO[situacao].classe}`}>
                      {ROTULO_SITUACAO[situacao].rotulo}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold">{f.titulo}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="size-4" aria-hidden />
                    {total} {total === 1 ? "inscrição" : "inscrições"}
                    {f.limite ? ` de ${f.limite}` : ""}
                    {f.fecha_em && ` · fecha em ${formatarDataHora(f.fecha_em)}`}
                  </p>
                </Link>
                <div className="flex gap-2 border-t p-3">
                  <BotaoCopiar texto={url} className="flex-1" />
                  <BotaoQrCode url={url} titulo={f.titulo} />
                  <Button asChild variant="outline">
                    <Link href={`/selecao?formulario=${f.id}`}>Ver inscritos</Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
