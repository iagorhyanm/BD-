import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { capitalizar, deBelem, formatarData, hojeEmBelem, somarDias } from "@/lib/datas";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { cn } from "@/lib/utils";
import { EditorDia } from "./editor-dia";
import { ImportarArquivo, ImportarCronologico } from "./importador";

export const metadata: Metadata = { title: "Plano de leitura" };

function mudarMes(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export default async function AdminPlanoPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requireAdmin();
  const hoje = hojeEmBelem();
  const q = (await searchParams).mes;
  const mes = q && /^\d{4}-(0[1-9]|1[0-2])$/.test(q) ? q : hoje.slice(0, 7);
  const inicio = `${mes}-01`;
  const fim = somarDias(`${mudarMes(mes, 1)}-01`, -1);
  const supabase = await createClient();
  const [{ data: dias }, { data: lim }, { data: marcas }] = await Promise.all([
    supabase.from("plano_dias").select("data, leitura, titulo, texto").gte("data", inicio).lte("data", fim).order("data"),
    supabase.rpc("limites_plano"),
    createAdminClient().from("checkins").select("data").gte("data", inicio).lte("data", fim),
  ]);
  const limites = (lim as { inicio: string | null; fim: string | null } | null) ?? { inicio: null, fim: null };
  const contagem = new Map<string, number>();
  for (const m of marcas ?? []) contagem.set(m.data, (contagem.get(m.data) ?? 0) + 1);
  const temPlano = !!limites.inicio;
  const fmt = (d: string) => d.split("-").reverse().join("/");

  return (
    <>
      <CabecalhoPagina
        titulo="Plano de leitura"
        descricao={temPlano ? `Publicado de ${fmt(limites.inicio!)} a ${fmt(limites.fim!)}. Todo mundo lê o mesmo texto em cada data.` : "Nenhum plano publicado ainda."}
        voltar={{ href: "/admin", rotulo: "Administração" }}
      />
      <div className="space-y-5">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Link href={`/admin/plano?mes=${mudarMes(mes, -1)}`} aria-label="Mês anterior" className="flex size-11 items-center justify-center rounded-xl border bg-card">
              <ChevronLeft className="size-5" />
            </Link>
            <h2 className="text-lg font-semibold">{capitalizar(formatarData(deBelem(inicio, "12:00"), "MMMM 'de' yyyy"))}</h2>
            <Link href={`/admin/plano?mes=${mudarMes(mes, 1)}`} aria-label="Próximo mês" className="flex size-11 items-center justify-center rounded-xl border bg-card">
              <ChevronRight className="size-5" />
            </Link>
          </div>
          {(dias ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-card p-6 text-center text-muted-foreground">Nenhuma leitura neste mês.</p>
          ) : (
            <ol className="divide-y overflow-hidden rounded-2xl border bg-card">
              {dias!.map((d) => (
                <li key={d.data} className={cn("flex items-center gap-3 px-3 py-2", d.data === hoje && "bg-primary/5")}>
                  <span className="w-12 shrink-0 text-center">
                    <span className="block text-xl font-bold tabular-nums">{d.data.slice(8)}</span>
                    <span className="block text-xs uppercase text-muted-foreground">{formatarData(deBelem(d.data, "12:00"), "EEE")}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{d.leitura}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[d.titulo, d.texto && "com texto de apoio", contagem.get(d.data) && `${contagem.get(d.data)} marcaram`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <EditorDia dia={{ ...d, marcados: contagem.get(d.data) ?? 0 }} />
                </li>
              ))}
            </ol>
          )}
          <EditorDia dataSugerida={limites.fim ? somarDias(limites.fim, 1) : hoje} />
        </section>

        <ImportarCronologico temPlano={temPlano} />
        <ImportarArquivo temPlano={temPlano} />
      </div>
    </>
  );
}
