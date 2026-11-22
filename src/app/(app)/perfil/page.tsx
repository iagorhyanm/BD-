import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Flame, KeyRound, Medal, Settings, Timer } from "lucide-react";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LIVROS, totalCapitulos } from "@/lib/biblia";
import { rotuloDia } from "@/lib/datas";
import { sair } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EditarNome } from "./editar-nome";
import { FotoPerfil } from "./foto-perfil";

export const metadata: Metadata = { title: "Perfil" };

type Estat = {
  dias: number; checkins: number; capitulos: number; minutos: number; sequencia: number; recorde: number;
  capitulos_distintos: number; livros_concluidos: number; por_livro: Record<string, number> | null;
};

export default async function PerfilPage() {
  const eu = await requireUsuario();
  const supabase = await createClient();
  const [{ data }, { data: historico }] = await Promise.all([
    supabase.rpc("estatisticas_usuario", { p_user: eu.id }),
    supabase
      .from("checkins")
      .select("id, data, no_prazo, plano_dias(leitura)")
      .eq("user_id", eu.id)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .limit(20),
  ]);
  const e = data as Estat;
  const porLivro = e.por_livro ?? {};
  const pctExato = (100 * e.capitulos_distintos) / totalCapitulos();
  const pctBiblia = Math.round(pctExato);
  const pctTexto = e.capitulos_distintos > 0 && pctBiblia === 0 ? "menos de 1%" : `${pctBiblia}%`;

  const cards = [
    { icone: Flame, valor: e.sequencia, rotulo: e.sequencia === 1 ? "dia seguido" : "dias seguidos", cor: "text-amber-600" },
    { icone: Medal, valor: e.recorde, rotulo: "recorde de sequência", cor: "text-primary" },
    { icone: BookOpen, valor: e.capitulos, rotulo: e.capitulos === 1 ? "capítulo lido" : "capítulos lidos", cor: "text-primary" },
    { icone: Timer, valor: e.minutos, rotulo: e.minutos === 1 ? "minuto de leitura" : "minutos de leitura", cor: "text-primary" },
  ];

  return (
    <div className="space-y-5">
      <section className="flex flex-col items-center gap-3 text-center">
        <FotoPerfil userId={eu.id} nome={eu.nome} foto={eu.foto_path} />
        <div className="min-w-0 max-w-full">
          <h1 className="truncate text-2xl font-bold">{eu.nome}</h1>
          <p className="text-muted-foreground">
            {e.dias} {e.dias === 1 ? "dia com leitura" : "dias com leitura"}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {cards.map(({ icone: Icone, valor, rotulo, cor }) => (
          <div key={rotulo} className="rounded-2xl border bg-card p-4">
            <Icone className={cn("size-5", cor)} aria-hidden />
            <p className="mt-1 text-3xl font-extrabold tabular-nums">{valor}</p>
            <p className="text-sm text-muted-foreground">{rotulo}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">Sua Bíblia</h2>
          <p className="text-sm text-muted-foreground">
            {pctTexto} lida · {e.livros_concluidos} {e.livros_concluidos === 1 ? "livro concluído" : "livros concluídos"}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary" style={{ width: `${Math.max(pctExato, e.capitulos_distintos ? 1 : 0)}%` }} />
        </div>
        {(["AT", "NT"] as const).map((t) => (
          <div key={t}>
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t === "AT" ? "Antigo Testamento" : "Novo Testamento"}
            </p>
            <ul className="grid grid-cols-6 gap-1 sm:grid-cols-10">
              {LIVROS.filter((l) => l.testamento === t).map((l) => {
                const lidos = porLivro[l.id] ?? 0;
                const pct = lidos / l.capitulos;
                return (
                  <li
                    key={l.id}
                    title={`${l.nome}: ${lidos} de ${l.capitulos} capítulos`}
                    aria-label={`${l.nome}: ${lidos} de ${l.capitulos} capítulos`}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-md text-[11px] font-semibold",
                      pct === 1 ? "bg-primary text-primary-foreground" : pct > 0 ? "bg-primary/25 text-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {l.abrev}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Verde escuro = livro completo · verde claro = em andamento</p>
      </section>

      <section className="space-y-2 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Suas últimas leituras</h2>
        {(historico ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ainda. Marque a leitura de hoje! 📖</p>
        ) : (
          <ul className="divide-y">
            {historico!.map((c) => (
              <li key={c.id}>
                <Link href={`/checkin/${c.id}`} className="flex min-h-11 items-center justify-between gap-2 py-2 hover:text-primary">
                  <span className="font-medium">{c.plano_dias?.leitura}</span>
                  <span className="shrink-0 text-right text-sm text-muted-foreground">
                    {rotuloDia(c.data)}
                    {!c.no_prazo && <span className="block text-xs">marcada depois</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {eu.papel === "admin" && (
        <Link
          href="/admin"
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 font-semibold text-primary"
        >
          <Settings className="size-5" aria-hidden />
          <span className="flex-1">
            Área do administrador
            <span className="block text-sm font-normal text-muted-foreground">Plano de leitura, textos do app, aviso e usuários</span>
          </span>
        </Link>
      )}

      <section className="space-y-3 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Conta</h2>
        <EditarNome nome={eu.nome} />
        <p className="text-sm text-muted-foreground">E-mail: {eu.email}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/trocar-senha">
              <KeyRound /> Trocar senha
            </Link>
          </Button>
          <form action={sair}>
            <Button type="submit" variant="ghost">Sair</Button>
          </form>
        </div>
      </section>
    </div>
  );
}
