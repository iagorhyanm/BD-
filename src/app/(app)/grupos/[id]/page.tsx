import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { carregarFeed } from "@/lib/feed";
import { formatarData, hojeEmBelem } from "@/lib/datas";
import { urlBase } from "@/lib/url";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CartaoCheckin } from "@/components/cartao-checkin";
import { Button } from "@/components/ui/button";
import { Convite } from "./convite";
import { Placar } from "./placar";
import { Membros } from "./membros";
import { AbasGrupo } from "./abas";

export const metadata: Metadata = { title: "Desafio" };

function diasEntre(a: string, b: string) {
  return Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86400000);
}

export default async function GrupoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const eu = await requireUsuario();
  const { id } = await params;
  const { aba } = await searchParams;
  const supabase = await createClient();

  const [{ data: g }, { data: placar }, { data: papel }, base] = await Promise.all([
    supabase.from("grupos").select("*").eq("id", id).maybeSingle(),
    supabase.rpc("placar_grupo", { p_grupo: id }),
    supabase.rpc("papel_no_grupo", { p_grupo: id }),
    urlBase(),
  ]);
  if (!g) notFound();

  const hoje = hojeEmBelem();
  const membrosIds = (placar ?? []).map((p) => p.user_id);
  const feed = await carregarFeed(eu.id, { userIds: membrosIds, de: g.inicio, ate: g.fim ?? undefined, limite: 40 });
  const naoComecou = g.inicio > hoje;
  const encerrado = !!g.fim && g.fim < hoje;
  const diaAtual = diasEntre(g.inicio, hoje) + 1;
  const total = g.fim ? diasEntre(g.inicio, g.fim) + 1 : null;
  const podeEditar = papel === "dono" || papel === "admin";

  return (
    <>
      <CabecalhoPagina
        titulo={g.nome}
        voltar={{ href: "/grupos", rotulo: "Desafios" }}
        descricao={
          naoComecou
            ? `Começa em ${formatarData(`${g.inicio}T12:00:00Z`)}`
            : encerrado
              ? `Encerrado em ${formatarData(`${g.fim}T12:00:00Z`)}`
              : total
                ? `Dia ${diaAtual} de ${total}`
                : `Dia ${diaAtual}`
        }
        acoes={
          podeEditar && (
            <Button asChild variant="outline">
              <Link href={`/grupos/${id}/editar`}>
                <Pencil /> Editar
              </Link>
            </Button>
          )
        }
      />
      {g.descricao && <p className="mb-4 whitespace-pre-line text-muted-foreground">{g.descricao}</p>}
      {total && !naoComecou && (
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Progresso do desafio: dia ${Math.min(diaAtual, total)} de ${total}`}>
          <div className="h-full bg-primary" style={{ width: `${Math.min(100, (100 * diaAtual) / total)}%` }} />
        </div>
      )}
      {!encerrado && <Convite codigo={g.codigo} nome={g.nome} url={`${base}/convite/${g.codigo}`} />}

      <AbasGrupo
        abaInicial={aba === "feed" ? "feed" : aba === "membros" ? "membros" : "placar"}
        placar={<Placar linhas={placar ?? []} euId={eu.id} />}
        feed={
          feed.length ? (
            <div className="space-y-3">{feed.map((item) => <CartaoCheckin key={item.id} item={item} euId={eu.id} />)}</div>
          ) : (
            <p className="rounded-2xl border border-dashed bg-card p-6 text-center text-muted-foreground">
              Nenhuma leitura no período do desafio ainda.
            </p>
          )
        }
        membros={<Membros grupoId={id} euId={eu.id} meuPapel={papel ?? "membro"} linhas={placar ?? []} />}
      />
    </>
  );
}
