import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, Clock, Plus, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { descreverAgenda, rotuloEnvio } from "@/lib/agenda";
import { agendaDe } from "@/lib/notificacoes-envio";
import { cn } from "@/lib/utils";
import { AcoesNotificacao, LembreteConfig } from "./controles";

export const metadata: Metadata = { title: "Notificações" };

export default async function AdminNotificacoesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const admin = createAdminClient();
  const [{ data: lista }, { data: cfg }, { data: envios }, { data: grupos }, { data: inscritos }] = await Promise.all([
    supabase.from("notificacoes_programadas").select("*").order("ativa", { ascending: false }).order("proximo_envio", { ascending: true, nullsFirst: false }),
    supabase.from("app_config").select("lembrete_ativo, lembrete_hora, lembrete_ultimo").eq("id", 1).single(),
    supabase.from("notificacoes_envios").select("id, tipo, enviado_em, destinatarios, entregues, notificacoes_programadas(titulo)").order("enviado_em", { ascending: false }).limit(15),
    supabase.from("grupos").select("id, nome"),
    admin.from("push_inscricoes").select("user_id"),
  ]);
  const nomeGrupo = new Map((grupos ?? []).map((g) => [g.id, g.nome]));
  const comNotificacao = new Set((inscritos ?? []).map((i) => i.user_id)).size;
  const publico = (n: { publico: string; grupo_id: string | null; pessoas: string[]; so_quem_nao_leu: boolean }) =>
    (n.publico === "todos" ? "Todo mundo" : n.publico === "grupo" ? `Desafio: ${nomeGrupo.get(n.grupo_id ?? "") ?? "—"}` : `${n.pessoas.length} ${n.pessoas.length === 1 ? "pessoa" : "pessoas"}`) +
    (n.so_quem_nao_leu ? " · só quem não leu" : "");

  return (
    <>
      <CabecalhoPagina
        titulo="Notificações"
        descricao="Programe mensagens para o celular da galera: uma vez, todo dia ou em dias da semana."
        voltar={{ href: "/admin", rotulo: "Administração" }}
        acoes={
          <Button asChild>
            <Link href="/admin/notificacoes/nova">
              <Plus /> Nova notificação
            </Link>
          </Button>
        }
      />
      <div className="space-y-5">
        <p className="flex items-center gap-2 rounded-2xl bg-primary/5 p-3 text-sm">
          <Users className="size-4 shrink-0 text-primary" aria-hidden />
          {comNotificacao === 1 ? "1 pessoa ativou" : `${comNotificacao} pessoas ativaram`} as notificações. Só quem ativou recebe.
        </p>

        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Clock className="size-5 text-primary" aria-hidden /> Lembrete automático
          </h2>
          <LembreteConfig ativo={cfg?.lembrete_ativo ?? true} hora={cfg?.lembrete_hora ?? "18:00"} />
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold">Programadas</h2>
          {(lista ?? []).length === 0 ? (
            <div className="space-y-3 rounded-2xl border border-dashed bg-card p-6 text-center">
              <BellRing className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <p className="text-muted-foreground">Nenhuma notificação programada ainda.</p>
              <Button asChild variant="outline">
                <Link href="/admin/notificacoes/nova">Programar a primeira</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {lista!.map((n) => (
                <li key={n.id} className={cn("flex gap-2 rounded-2xl border bg-card p-4", !n.ativa && "opacity-70")}>
                  <Link href={`/admin/notificacoes/${n.id}`} className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{n.titulo}</span>
                      {!n.ativa && <Badge variant="secondary">{n.recorrencia === "uma_vez" && n.ultimo_envio ? "Enviada" : "Pausada"}</Badge>}
                    </span>
                    <span className="line-clamp-2 block text-sm text-muted-foreground">{n.mensagem}</span>
                    <span className="block text-xs text-muted-foreground">
                      🗓️ {descreverAgenda(agendaDe(n))} · 👥 {publico(n)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {n.ativa && n.proximo_envio && <>Próximo: {rotuloEnvio(n.proximo_envio)}</>}
                      {n.ultimo_envio && (
                        <>
                          {n.ativa && n.proximo_envio ? " · " : ""}Último: {rotuloEnvio(n.ultimo_envio)}
                          {n.ultimo_total !== null && ` (${n.ultimo_total} ${n.ultimo_total === 1 ? "aparelho" : "aparelhos"})`}
                        </>
                      )}
                    </span>
                  </Link>
                  <AcoesNotificacao id={n.id} ativa={n.ativa} titulo={n.titulo} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {(envios ?? []).length > 0 && (
          <section className="space-y-2 rounded-2xl border bg-card p-4">
            <h2 className="font-semibold">Últimos envios</h2>
            <ul className="divide-y text-sm">
              {envios!.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">
                    {e.tipo === "lembrete" ? "⏰ Lembrete automático" : (e.notificacoes_programadas as { titulo: string } | null)?.titulo ?? "Notificação"}
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted-foreground">
                    {rotuloEnvio(e.enviado_em)}
                    <span className="block">
                      {e.entregues} {e.entregues === 1 ? "entregue" : "entregues"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
