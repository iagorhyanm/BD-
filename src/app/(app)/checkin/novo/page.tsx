import type { Metadata } from "next";
import Link from "next/link";
import { requireUsuario } from "@/lib/auth";
import { diasMarcaveis } from "@/lib/plano-dia";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Button } from "@/components/ui/button";
import { FormCheckin } from "../form-checkin";

export const metadata: Metadata = { title: "Marcar leitura" };

export default async function NovoCheckinPage({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const eu = await requireUsuario();
  const { dia } = await searchParams;
  const dias = await diasMarcaveis(eu.id);
  const pendentes = dias.filter((d) => !d.checkinId);

  return (
    <>
      <CabecalhoPagina titulo="Marcar leitura" descricao="Leia o texto do plano e marque aqui. No dia vale 1 ponto; com atraso (até 3 dias), meio ponto." />
      {dias.length === 0 ? (
        <div className="space-y-3 rounded-2xl border bg-card p-6 text-center">
          <p className="text-lg font-semibold">Ainda não há leitura no plano para hoje.</p>
          <p className="text-muted-foreground">Assim que o plano for publicado, a leitura do dia aparece aqui.</p>
          <Button asChild variant="outline"><Link href="/plano">Ver o plano</Link></Button>
        </div>
      ) : pendentes.length === 0 ? (
        <div className="space-y-3 rounded-2xl border bg-card p-6 text-center">
          <p className="text-3xl" aria-hidden>🎉</p>
          <p className="text-lg font-semibold">Você está em dia!</p>
          <p className="text-muted-foreground">Todas as leituras recentes já foram marcadas. Volte amanhã.</p>
          <Button asChild variant="outline"><Link href="/">Ir para o Início</Link></Button>
        </div>
      ) : (
        <FormCheckin userId={eu.id} dias={dias} diaInicial={dia} />
      )}
    </>
  );
}
