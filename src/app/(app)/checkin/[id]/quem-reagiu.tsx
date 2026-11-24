import { AvatarNome } from "@/components/avatar-nome";
import { rotuloDia } from "@/lib/datas";
import { EMOJIS_REACAO } from "@/lib/biblia";

export type Reacao = { userId: string; nome: string; foto: string | null; emoji: string; criadoEm: string };

/** Lista de quem reagiu na leitura, agrupada por pessoa (mais recentes primeiro). */
export function QuemReagiu({ reacoes, euId }: { reacoes: Reacao[]; euId: string }) {
  if (!reacoes.length) return null;
  const porPessoa = new Map<string, { nome: string; foto: string | null; emojis: string[]; ultimo: string }>();
  for (const r of reacoes) {
    const p = porPessoa.get(r.userId) ?? { nome: r.nome, foto: r.foto, emojis: [], ultimo: r.criadoEm };
    p.emojis.push(r.emoji);
    if (r.criadoEm > p.ultimo) p.ultimo = r.criadoEm;
    porPessoa.set(r.userId, p);
  }
  const pessoas = [...porPessoa.entries()].sort((a, b) => b[1].ultimo.localeCompare(a[1].ultimo));
  const ordem = (e: string) => (EMOJIS_REACAO as readonly string[]).indexOf(e);
  const total = reacoes.length;

  return (
    <section id="reacoes" aria-labelledby="t-reacoes" className="space-y-3 rounded-2xl border bg-card p-4">
      <h2 id="t-reacoes" className="font-semibold">
        Quem reagiu <span className="font-normal text-muted-foreground">({total})</span>
      </h2>
      <ul className="divide-y">
        {pessoas.map(([id, p]) => (
          <li key={id} className="flex min-h-12 items-center gap-3 py-2">
            <AvatarNome nome={p.nome} id={id} foto={p.foto} tamanho="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{id === euId ? "Você" : p.nome}</span>
              <span className="block text-xs text-muted-foreground">{rotuloDia(p.ultimo.slice(0, 10))}</span>
            </span>
            <span className="shrink-0 text-xl tracking-wide" aria-label={`Reagiu com ${p.emojis.join(" ")}`}>
              {[...p.emojis].sort((a, b) => ordem(a) - ordem(b)).join(" ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
