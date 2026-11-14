import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { FormEquipamento } from "../form-equipamento";
import { Emprestimos } from "./emprestimos";

export const metadata: Metadata = { title: "Equipamento" };

export default async function EquipPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("equipamentos")
    .select("*, emprestimos(id, quem, retirado_em, devolvido_em, observacao)")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();

  const [{ data: cats }, foto] = await Promise.all([
    supabase.from("equipamentos").select("categoria").eq("edicao_id", e.edicao_id).not("categoria", "is", null),
    e.foto_path ? supabase.storage.from("equipamentos").createSignedUrl(e.foto_path, 3600) : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <CabecalhoPagina titulo={e.item} voltar={{ href: "/equipamentos", rotulo: "Equipamentos" }} />
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] [&>*]:min-w-0">
        <FormEquipamento
          categorias={[...new Set((cats ?? []).map((c) => c.categoria!))]}
          equip={{
            id: e.id,
            item: e.item,
            categoria: e.categoria,
            quantidade: e.quantidade,
            dono_tipo: e.dono_tipo,
            dono_nome: e.dono_nome,
            estado: e.estado,
            responsavel: e.responsavel,
            observacoes: e.observacoes,
            fotoUrl: foto.data?.signedUrl ?? null,
          }}
        />
        <Emprestimos
          equipamentoId={e.id}
          lista={[...(e.emprestimos ?? [])].sort((a, b) => b.retirado_em.localeCompare(a.retirado_em))}
        />
      </div>
    </>
  );
}
