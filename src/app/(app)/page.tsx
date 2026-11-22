import Link from "next/link";
import { BookOpenCheck, CircleCheck, Flame, Trophy, Users } from "lucide-react";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { carregarFeed } from "@/lib/feed";
import { hojeEmBelem } from "@/lib/datas";
import { Button } from "@/components/ui/button";
import { EstadoVazio } from "@/components/estado-vazio";
import { CartaoCheckin } from "@/components/cartao-checkin";

export default async function InicioPage() {
  const eu = await requireUsuario();
  const supabase = await createClient();
  const hoje = hojeEmBelem();

  const [{ data: sequencia }, { count: leuHoje }, { count: grupos }, feed] = await Promise.all([
    supabase.rpc("sequencia_atual", { p_user: eu.id }),
    supabase.from("checkins").select("id", { count: "exact", head: true }).eq("user_id", eu.id).eq("data", hoje),
    supabase.from("grupo_membros").select("grupo_id", { count: "exact", head: true }).eq("user_id", eu.id),
    carregarFeed(eu.id, { limite: 30 }),
  ]);
  const seq = sequencia ?? 0;
  const primeiroNome = eu.nome.split(" ")[0];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm">
        <p className="text-primary-foreground/80">Olá, {primeiroNome}!</p>
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
        <Button asChild size="lg" className="mt-4 w-full bg-destaque text-destaque-foreground hover:bg-destaque/90">
          <Link href="/checkin/novo">
            <BookOpenCheck /> {leuHoje ? "Registrar outra leitura" : "Registrar a leitura de hoje"}
          </Link>
        </Button>
        {!leuHoje && seq > 0 && (
          <p className="mt-2 text-center text-xs text-primary-foreground/80">Leia hoje para não perder a sequência 🔥</p>
        )}
      </section>

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
