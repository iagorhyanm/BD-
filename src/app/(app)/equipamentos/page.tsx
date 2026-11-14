import type { Metadata } from "next";
import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { SemEdicao } from "@/components/sem-edicao";
import { Button } from "@/components/ui/button";
import { ListaEquipamentos } from "./lista-equipamentos";

export const metadata: Metadata = { title: "Equipamentos" };

export default async function EquipamentosPage() {
  await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) return <SemEdicao titulo="Equipamentos" />;

  const supabase = await createClient();
  const { data: equips } = await supabase
    .from("equipamentos")
    .select("*, emprestimos(id, quem, devolvido_em)")
    .eq("edicao_id", edicao.id)
    .order("item");

  const paths = [...new Set((equips ?? []).map((e) => e.foto_path).filter(Boolean) as string[])];
  const urls: Record<string, string> = {};
  if (paths.length) {
    const { data } = await supabase.storage.from("equipamentos").createSignedUrls(paths, 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Equipamentos"
        descricao={`Inventário de ${edicao.nome}.`}
        acoes={
          <Button asChild>
            <Link href="/equipamentos/novo">
              <PackagePlus /> Novo item
            </Link>
          </Button>
        }
      />
      <ListaEquipamentos
        itens={(equips ?? []).map((e) => {
          const aberto = (e.emprestimos ?? []).find((x) => !x.devolvido_em);
          return {
            id: e.id,
            item: e.item,
            categoria: e.categoria,
            quantidade: e.quantidade,
            dono_tipo: e.dono_tipo,
            dono_nome: e.dono_nome,
            estado: e.estado,
            responsavel: e.responsavel,
            foto: e.foto_path ? urls[e.foto_path] ?? null : null,
            comQuem: aberto?.quem ?? null,
          };
        })}
      />
    </>
  );
}
