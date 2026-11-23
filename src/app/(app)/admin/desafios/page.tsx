import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus, Trophy } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Button } from "@/components/ui/button";
import { formatarData, hojeEmBelem } from "@/lib/datas";

export const metadata: Metadata = { title: "Desafios" };

export default async function AdminDesafiosPage() {
  await requireAdmin();
  const admin = createAdminClient();
  const [{ data: grupos }, { data: membros }] = await Promise.all([
    admin.from("grupos").select("id, nome, inicio, fim, codigo").order("criado_em", { ascending: false }),
    admin.from("grupo_membros").select("grupo_id"),
  ]);
  const total = new Map<string, number>();
  for (const m of membros ?? []) total.set(m.grupo_id, (total.get(m.grupo_id) ?? 0) + 1);
  const hoje = hojeEmBelem();
  const fmt = (d: string) => formatarData(`${d}T12:00:00Z`, "dd/MM/yy");

  return (
    <>
      <CabecalhoPagina
        titulo="Desafios"
        descricao="Coloque pessoas já cadastradas direto num desafio, sem link nem código."
        voltar={{ href: "/admin", rotulo: "Administração" }}
        acoes={
          <Button asChild variant="outline">
            <Link href="/grupos/novo">
              <Plus /> Novo desafio
            </Link>
          </Button>
        }
      />
      {(grupos ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-card p-6 text-center text-muted-foreground">Nenhum desafio criado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {grupos!.map((g) => {
            const encerrado = !!g.fim && g.fim < hoje;
            return (
              <li key={g.id}>
                <Link href={`/admin/desafios/${g.id}`} className="flex min-h-16 items-center gap-3 rounded-2xl border bg-card p-4 hover:border-primary/40">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Trophy className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{g.nome}</span>
                    <span className="block text-sm text-muted-foreground">
                      {total.get(g.id) ?? 0} {(total.get(g.id) ?? 0) === 1 ? "pessoa" : "pessoas"} · desde {fmt(g.inicio)}
                      {g.fim && ` até ${fmt(g.fim)}`}
                      {encerrado && " · encerrado"}
                    </span>
                  </span>
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
