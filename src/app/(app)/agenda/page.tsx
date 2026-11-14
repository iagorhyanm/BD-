import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { SemEdicao } from "@/components/sem-edicao";
import { Button } from "@/components/ui/button";
import { VisaoAgenda } from "./visao-agenda";

export const metadata: Metadata = { title: "Agenda e escala" };

export default async function AgendaPage() {
  await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) return <SemEdicao titulo="Agenda e escala" />;

  const supabase = await createClient();
  const { data: eventos } = await supabase
    .from("eventos")
    .select("id, tipo, titulo, inicio, fim, local, escalas(count)")
    .eq("edicao_id", edicao.id)
    .order("inicio");

  return (
    <>
      <CabecalhoPagina
        titulo="Agenda e escala"
        descricao="Ensaios e apresentações."
        acoes={
          <Button asChild>
            <Link href="/agenda/novo">
              <CalendarPlus /> Novo evento
            </Link>
          </Button>
        }
      />
      <VisaoAgenda
        eventos={(eventos ?? []).map((e) => ({
          id: e.id,
          tipo: e.tipo,
          titulo: e.titulo,
          inicio: e.inicio,
          fim: e.fim,
          local: e.local,
          escalados: e.escalas?.[0]?.count ?? 0,
        }))}
      />
    </>
  );
}
