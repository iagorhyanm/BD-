import Link from "next/link";
import { BookOpenCheck, CalendarClock, CircleCheck, Flame, Megaphone, Trophy, Users } from "lucide-react";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { carregarFeed } from "@/lib/feed";
import { deBelem, formatarData, hojeEmBelem, rotuloDia } from "@/lib/datas";
import { diasMarcaveis } from "@/lib/plano-dia";
import { obterConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { EstadoVazio } from "@/components/estado-vazio";
import { CartaoCheckin } from "@/components/cartao-checkin";

export default async function InicioPage() {
  const eu = await requireUsuario();
  const supabase = await createClient();
  const hoje = hojeEmBelem();

  const [{ data: sequencia }, dias, { count: grupos }, feed, config] = await Promise.all([
    supabase.rpc("sequencia_atual", { p_user: eu.id }),
    diasMarcaveis(eu.id),
    supabase.from("grupo_membros").select("grupo_id", { count: "exact", head: true }).eq("user_id", eu.id),
    carregarFeed(eu.id, { limite: 30 }),
    obterConfig(),
  ]);
  const diaHoje = dias.find((d) => d.data === hoje);
  const leuHoje = !!diaHoje?.checkinId;
  const atrasados = dias.filter((d) => d.data !== hoje && !d.checkinId);
  const seq = sequencia ?? 0;
  const primeiroNome = eu.nome.split(" ")[0];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm">
        <p className="text-primary-foreground/80">Olá, {primeiroNome}! {config.boasVindas}</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-4xl font-extrabold tabular-nums">
              <Flame className="size-9 text-destaque" aria-hidden /> {seq}
            </p>
            <p className="text-sm text-primary-foreground/85">
              {seq === 1 ? "dia seguido de leitura" : "dias seguidos de leitura"}
            </p>
          </div>
          {leuHoje ? (
            <p className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold">
              <CircleCheck className="size-4" aria-hidden /> Leu hoje
            </p>
          ) : null}
        </div>
        {!leuHoje && seq > 0 && diaHoje && (
          <p className="mt-2 text-xs text-primary-foreground/80">Leia hoje para não perder a sequência 🔥</p>
        )}
      </section>

      {config.aviso && (
        <section role="status" className="flex gap-3 rounded-2xl border border-destaque/50 bg-destaque/15 p-4">
          <Megaphone className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
          <p className="whitespace-pre-line text-sm">{config.aviso}</p>
        </section>
      )}

      <section aria-labelledby="t-hoje" className="space-y-3 rounded-2xl border bg-card p-5">
        <p id="t-hoje" className="text-sm font-medium text-muted-foreground">
          Leitura de hoje · {formatarData(deBelem(hoje, "12:00"), "EEEE, d 'de' MMMM")}
        </p>
        {diaHoje ? (
          <>
            <div>
              <p className="text-2xl font-extrabold text-primary">{diaHoje.leitura}</p>
              {diaHoje.titulo && <p className="font-semibold">{diaHoje.titulo}</p>}
            </div>
            {diaHoje.texto && <p className="whitespace-pre-line text-sm text-muted-foreground">{diaHoje.texto}</p>}
            {leuHoje ? (
              <Button asChild variant="outline" className="w-full">
                <Link href={`/checkin/${diaHoje.checkinId}`}>
                  <CircleCheck /> Leitura de hoje feita! Ver meu check-in
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="h-14 w-full text-base">
                <Link href={`/checkin/novo?dia=${hoje}`}>
                  <BookOpenCheck /> Marcar como lida
                </Link>
              </Button>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">Não há leitura no plano para hoje. Aproveite para pôr em dia! 📖</p>
        )}
        <Link href="/plano" className="block text-center text-sm font-medium text-primary underline-offset-4 hover:underline">
          Ver o plano completo
        </Link>
      </section>

      {atrasados.length > 0 && (
        <section aria-labelledby="t-atraso" className="space-y-2 rounded-2xl border bg-card p-4">
          <h2 id="t-atraso" className="flex items-center gap-2 font-semibold">
            <CalendarClock className="size-5 text-amber-600" aria-hidden /> Dá tempo de recuperar
          </h2>
          <p className="text-sm text-muted-foreground">Leituras atrasadas ainda valem ponto (até 3 dias), mas não contam na sequência.</p>
          <ul className="divide-y">
            {atrasados.map((d) => (
              <li key={d.data}>
                <Link href={`/checkin/novo?dia=${d.data}`} className="flex min-h-12 items-center justify-between gap-2 py-2 hover:text-primary">
                  <span className="font-medium">{d.leitura}</span>
                  <span className="shrink-0 text-sm text-muted-foreground capitalize">{rotuloDia(d.data, hoje)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!grupos && (
        <EstadoVazio
          icone={Users}
          titulo="Leia junto com seus amigos"
          descricao="Crie um desafio e mande o link para a galera, ou entre num desafio com o código de convite."
          acao={
            <Button asChild>
              <Link href="/grupos">
                <Trophy /> Ver desafios
              </Link>
            </Button>
          }
        />
      )}

      <section aria-labelledby="t-feed" className="space-y-3">
        <h2 id="t-feed" className="text-lg font-semibold">
          Leituras recentes
        </h2>
        {feed.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card p-6 text-center text-muted-foreground">
            Ainda não há leituras por aqui. Que tal começar agora? 📖
          </p>
        ) : (
          feed.map((item) => <CartaoCheckin key={item.id} item={item} euId={eu.id} />)
        )}
      </section>
    </div>
  );
}
