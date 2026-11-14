import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { requireEdg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatarDataHora } from "@/lib/datas";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Log de atividades" };

const ENTIDADES: Record<string, string> = {
  inscricoes: "Inscrição",
  membros: "Membro",
  edicoes: "Edição",
  formularios: "Formulário",
  profiles: "Usuário",
  eventos: "Evento",
  equipamentos: "Equipamento",
  musicas: "Música",
  avisos: "Aviso",
};

const ROTULO_CAMPO: Record<string, string> = {
  status: "status",
  ativo: "ativo",
  nome: "nome",
  titulo: "título",
  aberto: "aberto",
  estado: "estado",
  fixado: "fixado",
  quantidade: "quantidade",
  responsavel: "responsável",
  inicio: "início",
  fim: "término",
  local: "local",
  limite: "limite",
  vagas_masculino: "vagas H",
  vagas_feminino: "vagas M",
  limite_faltas: "limite de faltas",
};

const POR_PAGINA = 50;

function valor(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "sim" : "não";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return formatarDataHora(s, "dd/MM HH:mm");
  return s.replace(/_/g, " ");
}

export default async function LogsPage({ searchParams }: { searchParams: Promise<{ entidade?: string; pagina?: string }> }) {
  await requireEdg();
  const { entidade, pagina } = await searchParams;
  const p = Math.max(1, Number(pagina) || 1);
  const supabase = await createClient();
  let q = supabase
    .from("logs")
    .select("*", { count: "exact" })
    .order("criado_em", { ascending: false })
    .range((p - 1) * POR_PAGINA, p * POR_PAGINA - 1);
  if (entidade && ENTIDADES[entidade]) q = q.eq("entidade", entidade);
  const { data: logs, count } = await q;
  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA));
  const url = (e?: string, pg?: number) => {
    const sp = new URLSearchParams();
    if (e) sp.set("entidade", e);
    if (pg && pg > 1) sp.set("pagina", String(pg));
    const s = sp.toString();
    return `/admin/logs${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <CabecalhoPagina titulo="Log de atividades" descricao="Quem fez o quê e quando." voltar={{ href: "/admin", rotulo: "Administração" }} />
      <nav aria-label="Filtrar por tipo" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={url()} className={cn("min-h-9 shrink-0 rounded-full border px-3 py-1.5 text-sm", !entidade ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
          Tudo
        </Link>
        {Object.entries(ENTIDADES).map(([k, r]) => (
          <Link key={k} href={url(k)} className={cn("min-h-9 shrink-0 rounded-full border px-3 py-1.5 text-sm", entidade === k ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
            {r}
          </Link>
        ))}
      </nav>
      {!logs?.length ? (
        <EstadoVazio icone={History} titulo="Nenhuma atividade registrada" />
      ) : (
        <ol className="space-y-2">
          {logs.map((l) => {
            const mudancas = (l.dados ?? {}) as Record<string, { de: unknown; para: unknown }>;
            return (
              <li key={l.id} className="rounded-xl border bg-card p-3 text-sm">
                <p>
                  <strong>{l.ator_nome ?? "Sistema"}</strong> {l.acao}{" "}
                  <span className="text-muted-foreground">{(ENTIDADES[l.entidade] ?? l.entidade).toLowerCase()}</span>{" "}
                  {l.descricao && <strong>“{l.descricao}”</strong>}
                </p>
                {Object.keys(mudancas).length > 0 && l.acao === "alterou" && (
                  <ul className="mt-1 text-muted-foreground">
                    {Object.entries(mudancas).map(([campo, m]) => (
                      <li key={campo}>
                        {ROTULO_CAMPO[campo] ?? campo}: {valor(m?.de)} → <span className="text-foreground">{valor(m?.para)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{formatarDataHora(l.criado_em, "dd/MM/yyyy HH:mm")}</p>
              </li>
            );
          })}
        </ol>
      )}
      {totalPaginas > 1 && (
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button asChild variant="outline" disabled={p <= 1} className={cn(p <= 1 && "pointer-events-none opacity-50")}>
            <Link href={url(entidade, p - 1)}>Anteriores</Link>
          </Button>
          <span className="text-sm text-muted-foreground">Página {p} de {totalPaginas}</span>
          <Button asChild variant="outline" className={cn(p >= totalPaginas && "pointer-events-none opacity-50")}>
            <Link href={url(entidade, p + 1)}>Seguintes</Link>
          </Button>
        </div>
      )}
    </>
  );
}
