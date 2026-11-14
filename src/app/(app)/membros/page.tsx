import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { listarFuncoes, listarMembros } from "@/lib/membros";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { SemEdicao } from "@/components/sem-edicao";
import { Button } from "@/components/ui/button";
import { ListaMembros } from "./lista-membros";

export const metadata: Metadata = { title: "Membros" };

export default async function MembrosPage() {
  await requireStaff();
  const edicao = await obterEdicaoAtual();
  if (!edicao) return <SemEdicao titulo="Membros" />;

  const supabase = await createClient();
  const [membros, funcoes, { data: resumo }] = await Promise.all([
    listarMembros(edicao.id),
    listarFuncoes(true),
    supabase.from("resumo_presenca").select("membro_id, faltas, percentual").eq("edicao_id", edicao.id),
  ]);
  const presenca = Object.fromEntries((resumo ?? []).map((r) => [r.membro_id!, { faltas: r.faltas ?? 0, percentual: r.percentual }]));

  return (
    <>
      <CabecalhoPagina
        titulo="Membros"
        descricao={`Equipe de ${edicao.nome}.`}
        acoes={
          <Button asChild>
            <Link href="/membros/novo">
              <UserPlus /> Novo membro
            </Link>
          </Button>
        }
      />
      <ListaMembros
        membros={membros}
        funcoes={funcoes}
        presenca={presenca}
        limiteFaltas={edicao.limite_faltas}
        nomeEdicao={edicao.nome}
      />
    </>
  );
}
