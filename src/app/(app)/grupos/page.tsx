import { formatarPontos, rotuloPontos } from "@/lib/pontos";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus, Trophy, Users } from "lucide-react";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatarData, hojeEmBelem } from "@/lib/datas";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { Button } from "@/components/ui/button";
import { EntrarComCodigo } from "./entrar-com-codigo";

export const metadata: Metadata = { title: "Desafios" };

export default async function GruposPage() {
  const eu = await requireUsuario();
  const supabase = await createClient();
  const { data: meus } = await supabase
    .from("grupo_membros")
    .select("papel, grupos(id, nome, inicio, fim, grupo_membros(count))")
    .eq("user_id", eu.id);
  const hoje = hojeEmBelem();

  const grupos = await Promise.all(
    (meus ?? [])
      .filter((m) => m.grupos)
      .map(async (m) => {
        const g = m.grupos!;
        const { data: placar } = await supabase.rpc("placar_grupo", { p_grupo: g.id });
        const pos = (placar ?? []).findIndex((p) => p.user_id === eu.id);
        return {
          ...g,
          membros: g.grupo_membros?.[0]?.count ?? 0,
          posicao: pos >= 0 ? pos + 1 : null,
          pontos: pos >= 0 ? placar![pos].pontos : 0,
          encerrado: !!g.fim && g.fim < hoje,
        };
      }),
  );
  grupos.sort((a, b) => Number(a.encerrado) - Number(b.encerrado) || b.inicio.localeCompare(a.inicio));

  const acoes = (
    <>
      <EntrarComCodigo />
      <Button asChild>
        <Link href="/grupos/novo">
          <Plus /> Novo desafio
        </Link>
      </Button>
    </>
  );

  return (
    <>
      <CabecalhoPagina titulo="Desafios" descricao="Leia junto com seus amigos e suba no placar." acoes={acoes} />
      {grupos.length === 0 ? (
        <EstadoVazio
          icone={Trophy}
          titulo="Você ainda não está em nenhum desafio"
          descricao="Crie um desafio (ex.: “Novo Testamento em 90 dias”) e convide a galera, ou entre com um código de convite."
        />
      ) : (
        <ul className="space-y-3">
          {grupos.map((g) => (
            <li key={g.id}>
              <Link href={`/grupos/${g.id}`} className="flex items-center gap-4 rounded-2xl border bg-card p-4 hover:border-primary/40">
                <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <span className="text-xl leading-none font-extrabold">{g.posicao ?? "–"}º</span>
                  <span className="text-[10px] opacity-80">lugar</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{g.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatarPontos(g.pontos)} {rotuloPontos(g.pontos)} · <Users className="inline size-3.5" aria-hidden /> {g.membros}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {g.encerrado ? "Encerrado" : g.fim ? `Até ${formatarData(`${g.fim}T12:00:00Z`)}` : "Sem data para acabar"}
                  </p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
