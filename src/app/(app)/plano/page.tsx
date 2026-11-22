import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { capitalizar, deBelem, formatarData, hojeEmBelem, somarDias } from "@/lib/datas";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Plano de leitura" };

function mesValido(m?: string) {
  return m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : null;
}
function mudarMes(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function PlanoPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const eu = await requireUsuario();
  const hoje = hojeEmBelem();
  const mes = mesValido((await searchParams).mes) ?? hoje.slice(0, 7);
  const inicio = `${mes}-01`;
  const fim = somarDias(`${mudarMes(mes, 1)}-01`, -1);
  const supabase = await createClient();
  const [{ data: dias }, { data: feitos }, { data: limites }] = await Promise.all([
    supabase.from("plano_dias").select("data, leitura, titulo").gte("data", inicio).lte("data", fim).order("data"),
    supabase.from("checkins").select("id, data, no_prazo").eq("user_id", eu.id).gte("data", inicio).lte("data", fim),
    supabase.rpc("limites_plano"),
  ]);
  const porData = new Map((feitos ?? []).map((f) => [f.data, f]));
  const lim = (limites as { inicio: string | null; fim: string | null } | null) ?? { inicio: null, fim: null };
  const temAntes = !!lim.inicio && lim.inicio < inicio;
  const temDepois = !!lim.fim && lim.fim > fim;
  const limiteAtraso = somarDias(hoje, -3);

  return (
    <>
      <CabecalhoPagina titulo="Plano de leitura" descricao="A mesma leitura para todo mundo, um texto por dia." />
      <div className="mb-4 flex items-center justify-between gap-2">
        {temAntes ? (
          <Link href={`/plano?mes=${mudarMes(mes, -1)}`} aria-label="Mês anterior" className="flex size-11 items-center justify-center rounded-xl border bg-card">
            <ChevronLeft className="size-5" />
          </Link>
        ) : <span className="size-11" />}
        <h2 className="text-lg font-semibold">{capitalizar(formatarData(deBelem(inicio, "12:00"), "MMMM 'de' yyyy"))}</h2>
        {temDepois ? (
          <Link href={`/plano?mes=${mudarMes(mes, 1)}`} aria-label="Próximo mês" className="flex size-11 items-center justify-center rounded-xl border bg-card">
            <ChevronRight className="size-5" />
          </Link>
        ) : <span className="size-11" />}
      </div>

      {(dias ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card p-6 text-center text-muted-foreground">
          {lim.inicio ? "Nenhuma leitura neste mês." : "O plano ainda não foi publicado."}
        </p>
      ) : (
        <ol className="divide-y overflow-hidden rounded-2xl border bg-card">
          {dias!.map((d) => {
            const c = porData.get(d.data);
            const ehHoje = d.data === hoje;
            const marcavel = !c && d.data <= hoje && d.data >= limiteAtraso;
            const status = c
              ? c.no_prazo ? { t: "✅ lida", cls: "text-primary" } : { t: "☑️ lida depois", cls: "text-primary" }
              : d.data > hoje ? null
              : marcavel ? { t: ehHoje ? "para hoje" : "dá tempo", cls: "text-amber-700" }
              : { t: "não lida", cls: "text-muted-foreground" };
            const conteudo = (
              <>
                <span className={cn("w-12 shrink-0 text-center", ehHoje && "font-bold text-primary")}>
                  <span className="block text-xl font-bold tabular-nums">{d.data.slice(8)}</span>
                  <span className="block text-xs uppercase text-muted-foreground">{formatarData(deBelem(d.data, "12:00"), "EEE")}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{d.leitura}</span>
                  {d.titulo && <span className="block text-sm text-muted-foreground">{d.titulo}</span>}
                </span>
                {status && <span className={cn("shrink-0 text-xs font-medium", status.cls)}>{status.t}</span>}
              </>
            );
            const cls = cn("flex min-h-16 items-center gap-3 px-3 py-2", ehHoje && "bg-primary/5");
            return (
              <li key={d.data} id={ehHoje ? "hoje" : undefined}>
                {c ? (
                  <Link href={`/checkin/${c.id}`} className={cn(cls, "hover:bg-muted/50")}>{conteudo}</Link>
                ) : marcavel ? (
                  <Link href={`/checkin/novo?dia=${d.data}`} className={cn(cls, "hover:bg-muted/50")}>{conteudo}</Link>
                ) : (
                  <div className={cls}>{conteudo}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
