import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  ClipboardList,
  Guitar,
  MapPin,
  Pin,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import { capitalizar, formatarDataHora } from "@/lib/datas";
import { CLASSE_TIPO_EVENTO, ROTULO_ESTADO, ROTULO_TIPO_EVENTO } from "@/lib/dominio";
import { Button } from "@/components/ui/button";
import { EstadoVazio } from "@/components/estado-vazio";
import { cn } from "@/lib/utils";

export default async function PainelPage() {
  const perfil = await requireStaff();
  const edicao = await obterEdicaoAtual();
  const primeiroNome = perfil.nome.split(" ")[0];
  const ehEdg = perfil.papel === "edg";

  const saudacao = (
    <div>
      <p className="text-muted-foreground">Paz e bem,</p>
      <h1 className="text-2xl font-bold tracking-tight">{primeiroNome} 🎶</h1>
    </div>
  );

  if (!edicao) {
    return (
      <div className="space-y-6">
        {saudacao}
        <EstadoVazio
          icone={CalendarPlus}
          titulo="Nenhuma edição cadastrada"
          descricao={
            ehEdg
              ? "Comece criando a edição do EJC (ex.: “EJC 2027”). Todos os dados ficam organizados por edição."
              : "Peça ao EDG para criar a edição do EJC. Todos os dados ficam organizados por edição."
          }
          acao={
            ehEdg && (
              <Button asChild size="lg">
                <Link href="/admin/edicoes">Criar edição</Link>
              </Button>
            )
          }
        />
      </div>
    );
  }

  const supabase = await createClient();
  const seteDias = new Date(Date.now() - 7 * 24 * 3600e3).toISOString();
  const [
    { data: proximos },
    { data: inscricoes },
    { data: faltosos },
    { data: equipProblema },
    { data: fixados },
  ] = await Promise.all([
    supabase
      .from("eventos")
      .select("id, titulo, tipo, inicio, fim, local, escalas(count), setlists(id, setlist_itens(count)), checklist_itens(conferido)")
      .eq("edicao_id", edicao.id)
      .gte("inicio", new Date(Date.now() - 3 * 3600e3).toISOString())
      .order("inicio")
      .limit(3),
    supabase.from("inscricoes").select("id, nome, sexo, status, criado_em").eq("edicao_id", edicao.id).order("criado_em", { ascending: false }),
    supabase
      .from("resumo_presenca")
      .select("membro_id, nome, faltas")
      .eq("edicao_id", edicao.id)
      .eq("ativo", true)
      .gte("faltas", Math.max(1, edicao.limite_faltas))
      .order("faltas", { ascending: false })
      .limit(8),
    supabase.from("equipamentos").select("id, item, estado").eq("edicao_id", edicao.id).neq("estado", "bom").order("item"),
    supabase.from("avisos").select("id, titulo, texto, criado_em").eq("edicao_id", edicao.id).eq("fixado", true).order("criado_em", { ascending: false }).limit(3),
  ]);

  const todas = inscricoes ?? [];
  const novas = todas.filter((i) => i.criado_em >= seteDias);
  const pendentes = todas.filter((i) => i.status === "pendente");
  const sel = {
    masculino: todas.filter((i) => i.sexo === "masculino" && i.status === "selecionado").length,
    feminino: todas.filter((i) => i.sexo === "feminino" && i.status === "selecionado").length,
  };
  const proximo = proximos?.[0];
  const outros = (proximos ?? []).slice(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        {saudacao}
        <p className="text-sm text-muted-foreground">
          {edicao.nome}
          {edicao.ativa ? " · edição ativa" : ""}
        </p>
      </div>

      {/* Avisos fixados */}
      {(fixados ?? []).length > 0 && (
        <section aria-labelledby="t-fixados" className="space-y-2">
          <h2 id="t-fixados" className="sr-only">Avisos fixados</h2>
          {fixados!.map((a) => (
            <Link key={a.id} href="/avisos" className="block rounded-xl border border-destaque bg-destaque/10 p-4 hover:bg-destaque/20">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Pin className="size-4" aria-hidden /> {a.titulo}
              </p>
              <p className="mt-1 line-clamp-2 text-sm whitespace-pre-line text-muted-foreground">{a.texto}</p>
            </Link>
          ))}
        </section>
      )}

      {/* Próximo evento */}
      <section aria-labelledby="t-proximo">
        <h2 id="t-proximo" className="mb-2 font-semibold">Próximo ensaio/apresentação</h2>
        {proximo ? (
          <Link href={`/agenda/${proximo.id}`} className="block rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", CLASSE_TIPO_EVENTO[proximo.tipo])}>
              {ROTULO_TIPO_EVENTO[proximo.tipo]}
            </span>
            <p className="mt-2 text-xl font-bold">{proximo.titulo}</p>
            <p className="mt-1 text-primary-foreground/85">
              {capitalizar(formatarDataHora(proximo.inicio, "EEEE, dd/MM 'às' HH:mm"))}
            </p>
            {proximo.local && (
              <p className="mt-1 flex items-center gap-1 text-sm text-primary-foreground/80">
                <MapPin className="size-4" aria-hidden /> {proximo.local}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-white/15 px-3 py-1">{proximo.escalas?.[0]?.count ?? 0} na escala</span>
              <span className="rounded-full bg-white/15 px-3 py-1">
                {(() => {
                  const s = Array.isArray(proximo.setlists) ? proximo.setlists[0] : proximo.setlists;
                  return s ? `${s.setlist_itens?.[0]?.count ?? 0} músicas` : "sem setlist";
                })()}
              </span>
              {(proximo.checklist_itens ?? []).length > 0 && (
                <span className="rounded-full bg-white/15 px-3 py-1">
                  checklist {(proximo.checklist_itens ?? []).filter((c) => c.conferido).length}/{proximo.checklist_itens!.length}
                </span>
              )}
            </div>
          </Link>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed bg-card p-5">
            <p className="text-muted-foreground">Nenhum evento marcado.</p>
            <Button asChild variant="outline">
              <Link href="/agenda/novo">
                <CalendarDays /> Marcar ensaio
              </Link>
            </Button>
          </div>
        )}
        {outros.length > 0 && (
          <ul className="mt-2 space-y-1">
            {outros.map((e) => (
              <li key={e.id}>
                <Link href={`/agenda/${e.id}`} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                  <span className="truncate">
                    <strong>{formatarDataHora(e.inicio, "dd/MM HH:mm")}</strong> · {e.titulo}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Inscrições */}
        <Cartao titulo="Inscrições" icone={ClipboardList} href="/selecao">
          <div className="grid grid-cols-2 gap-2">
            <Numero valor={novas.length} rotulo="novas (7 dias)" />
            <Numero valor={pendentes.length} rotulo="pendentes" destaque={pendentes.length > 0} />
          </div>
          {novas.slice(0, 3).map((i) => (
            <p key={i.id} className="truncate text-sm text-muted-foreground">
              • {i.nome} <span className="text-xs">({formatarDataHora(i.criado_em, "dd/MM")})</span>
            </p>
          ))}
        </Cartao>

        {/* Selecionados H x M */}
        <Cartao titulo="Selecionados" icone={UserCheck} href="/selecao">
          <div className="grid grid-cols-2 gap-2">
            <BarraVagas rotulo="Homens" valor={sel.masculino} vagas={edicao.vagas_masculino} />
            <BarraVagas rotulo="Mulheres" valor={sel.feminino} vagas={edicao.vagas_feminino} />
          </div>
        </Cartao>

        {/* Faltas */}
        <Cartao titulo={`Faltas (limite ${edicao.limite_faltas})`} icone={TriangleAlert} href="/presenca?aba=relatorio">
          {(faltosos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Ninguém no limite de faltas. 👏</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {faltosos!.map((f) => (
                <li key={f.membro_id} className="flex justify-between gap-2">
                  <span className="truncate">{f.nome}</span>
                  <span className={cn("font-semibold", (f.faltas ?? 0) > edicao.limite_faltas ? "text-rose-700" : "text-amber-700")}>
                    {f.faltas} {f.faltas === 1 ? "falta" : "faltas"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        {/* Equipamentos */}
        <Cartao titulo="Equipamentos com problema" icone={Guitar} href="/equipamentos">
          {(equipProblema ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Tudo em bom estado.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {equipProblema!.map((e) => (
                <li key={e.id} className="flex justify-between gap-2">
                  <span className="truncate">{e.item}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", ROTULO_ESTADO[e.estado].classe)}>
                    {ROTULO_ESTADO[e.estado].rotulo}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </div>
  );
}

function Cartao({
  titulo,
  icone: Icone,
  href,
  children,
}: {
  titulo: string;
  icone: React.ComponentType<{ className?: string }>;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <Link href={href} className="flex items-center gap-2 font-semibold hover:underline">
        <span className="flex size-8 items-center justify-center rounded-lg bg-destaque/20 text-primary">
          <Icone className="size-4" />
        </span>
        <span className="flex-1">{titulo}</span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
      {children}
    </section>
  );
}

function Numero({ valor, rotulo, destaque }: { valor: number; rotulo: string; destaque?: boolean }) {
  return (
    <div className={cn("rounded-lg px-3 py-2", destaque ? "bg-destaque/20" : "bg-muted")}>
      <p className="text-2xl font-bold">{valor}</p>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
    </div>
  );
}

function BarraVagas({ rotulo, valor, vagas }: { rotulo: string; valor: number; vagas: number }) {
  const pct = vagas > 0 ? Math.min(100, (100 * valor) / vagas) : 0;
  const passou = vagas > 0 && valor > vagas;
  return (
    <div className="rounded-lg bg-muted px-3 py-2">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className={cn("text-2xl font-bold", passou && "text-rose-700")}>
        {valor}
        <span className="text-base font-medium text-muted-foreground"> / {vagas || "—"}</span>
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background" aria-hidden>
        <div className={cn("h-full", passou ? "bg-rose-600" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
