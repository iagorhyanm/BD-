import { Flame } from "lucide-react";
import { AvatarNome } from "@/components/avatar-nome";
import { rotuloDia } from "@/lib/datas";
import { cn } from "@/lib/utils";

type Linha = { user_id: string; nome: string; foto_path: string | null; pontos: number; sequencia: number; ultimo: string | null };
const MEDALHAS = ["🥇", "🥈", "🥉"];

export function Placar({ linhas, euId }: { linhas: Linha[]; euId: string }) {
  // Empates dividem a posição.
  let pos = 0;
  let anterior: number | null = null;
  const comPosicao = linhas.map((l, i) => {
    if (l.pontos !== anterior) pos = i + 1;
    anterior = l.pontos;
    return { ...l, pos };
  });

  return (
    <ol className="space-y-2" aria-label="Placar">
      {comPosicao.map((l) => (
        <li
          key={l.user_id}
          className={cn("flex items-center gap-3 rounded-2xl border bg-card p-3", l.user_id === euId && "border-primary ring-1 ring-primary")}
        >
          <span className="w-8 text-center text-xl font-extrabold tabular-nums" aria-label={`${l.pos}º lugar`}>
            {l.pontos > 0 && l.pos <= 3 ? MEDALHAS[l.pos - 1] : `${l.pos}º`}
          </span>
          <AvatarNome nome={l.nome} id={l.user_id} foto={l.foto_path} tamanho="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{l.user_id === euId ? `${l.nome} (você)` : l.nome}</p>
            <p className="text-xs text-muted-foreground">{l.ultimo ? `Última leitura: ${rotuloDia(l.ultimo)}` : "Ainda não leu no desafio"}</p>
          </div>
          {l.sequencia > 0 && (
            <span className="flex items-center gap-0.5 text-sm font-semibold text-amber-700" title="Dias seguidos">
              <Flame className="size-4" aria-hidden /> {l.sequencia}
            </span>
          )}
          <span className="w-14 text-right">
            <span className="block text-xl leading-none font-extrabold tabular-nums">{l.pontos}</span>
            <span className="text-[11px] text-muted-foreground">{l.pontos === 1 ? "ponto" : "pontos"}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
