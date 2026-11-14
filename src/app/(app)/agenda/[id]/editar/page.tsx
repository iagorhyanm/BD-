import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatarDataHora } from "@/lib/datas";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormEvento } from "../../form-evento";

export const metadata: Metadata = { title: "Editar evento" };

export default async function EditarEventoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: ev } = await supabase.from("eventos").select("*").eq("id", id).maybeSingle();
  if (!ev) notFound();
  return (
    <>
      <CabecalhoPagina titulo="Editar evento" voltar={{ href: `/agenda/${id}`, rotulo: ev.titulo }} />
      <FormEvento
        evento={{
          id: ev.id,
          tipo: ev.tipo,
          titulo: ev.titulo,
          data: formatarDataHora(ev.inicio, "yyyy-MM-dd"),
          hora_inicio: formatarDataHora(ev.inicio, "HH:mm"),
          hora_fim: ev.fim ? formatarDataHora(ev.fim, "HH:mm") : "",
          local: ev.local,
          pauta: ev.pauta,
        }}
      />
    </>
  );
}
