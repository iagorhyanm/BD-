"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListMusic, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { salvarSetlist } from "@/server/actions/repertorio";

type Setlist = { id: string; titulo: string; itens: { id: string; titulo: string; artista: string | null; tom: string | null }[] };

export function SetlistDoEvento({ eventoId, tituloEvento, setlist }: { eventoId: string; tituloEvento: string; setlist: Setlist | null }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Repertório do dia</h2>
        {setlist && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/repertorio/setlists/${setlist.id}`}>
              <Pencil /> Editar setlist
            </Link>
          </Button>
        )}
      </div>
      {setlist ? (
        setlist.itens.length ? (
          <ol className="space-y-1">
            {setlist.itens.map((i, idx) => (
              <li key={i.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 odd:bg-muted/50">
                <span className="w-6 text-right text-sm font-semibold text-muted-foreground">{idx + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{i.titulo}</span>
                  {i.artista && <span className="block truncate text-xs text-muted-foreground">{i.artista}</span>}
                </span>
                {i.tom && <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-sm font-semibold">{i.tom}</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">A setlist ainda está vazia.</p>
        )
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ListMusic className="size-4" aria-hidden /> Nenhuma setlist para este evento.
          </p>
          <Button
            type="button"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                const fd = new FormData();
                fd.set("titulo", tituloEvento);
                fd.set("evento_id", eventoId);
                const r = await salvarSetlist(null, fd);
                if (!r.ok) return void toast.error(r.erro);
                router.push(`/repertorio/setlists/${r.dados.id}`);
              })
            }
          >
            <ListMusic /> Montar repertório do dia
          </Button>
        </div>
      )}
    </section>
  );
}
