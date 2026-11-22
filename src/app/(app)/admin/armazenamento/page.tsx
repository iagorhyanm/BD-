import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Armazenamento" };

/** Espaço do plano gratuito do Supabase. */
const LIMITE_BYTES = 1024 * 1024 * 1024;
const NOMES: Record<string, string> = {
  checkins: "Fotos das leituras",
};

const mb = (b: number) => `${(b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 1 : 0).replace(".", ",")} MB`;

export default async function ArmazenamentoPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: uso } = await supabase.rpc("uso_armazenamento");
  const total = (uso ?? []).reduce((s, u) => s + Number(u.bytes), 0);
  const pct = Math.min(100, (100 * total) / LIMITE_BYTES);

  return (
    <>
      <CabecalhoPagina
        titulo="Armazenamento"
        descricao="Espaço usado pelas fotos (plano gratuito do Supabase: 1 GB)."
        voltar={{ href: "/admin", rotulo: "Administração" }}
      />
      <div className="space-y-4">
        <section className="rounded-xl border bg-card p-4">
          <p className="text-3xl font-bold">
            {mb(total)} <span className="text-base font-medium text-muted-foreground">de 1 GB ({pct.toFixed(0)}%)</span>
          </p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${pct.toFixed(0)}% usado`}>
            <div className={cn("h-full", pct > 85 ? "bg-rose-600" : pct > 60 ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
          </div>
          {pct > 85 && (
            <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
              O espaço está quase cheio. Considere o plano pago do Supabase ou peça para usarem menos fotos.
            </p>
          )}
          <ul className="mt-4 space-y-2 text-sm">
            {(uso ?? []).map((u) => (
              <li key={u.bucket} className="flex justify-between gap-2">
                <span>{NOMES[u.bucket] ?? u.bucket} <span className="text-muted-foreground">({u.arquivos} arquivos)</span></span>
                <span className="font-semibold">{mb(Number(u.bytes))}</span>
              </li>
            ))}
          </ul>
        </section>
        <p className="text-sm text-muted-foreground">
          As fotos são reduzidas no celular antes do envio. Ao excluir uma leitura, a foto dela também é apagada.
        </p>
      </div>
    </>
  );
}
