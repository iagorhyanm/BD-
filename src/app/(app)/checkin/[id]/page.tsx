import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireUsuario } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { carregarFeed } from "@/lib/feed";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CartaoCheckin } from "@/components/cartao-checkin";
import { Button } from "@/components/ui/button";
import { Comentarios } from "./comentarios";

export const metadata: Metadata = { title: "Leitura" };

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const eu = await requireUsuario();
  const { id } = await params;
  const supabase = await createClient();
  const [[item], { data: comentarios }] = await Promise.all([
    carregarFeed(eu.id, { ids: [id], limite: 1 }),
    supabase.from("comentarios").select("id, texto, criado_em, user_id, profiles(nome, foto_path)").eq("checkin_id", id).order("criado_em"),
  ]);
  if (!item) notFound();

  return (
    <>
      <CabecalhoPagina
        titulo="Leitura"
        voltar={{ href: "/", rotulo: "Início" }}
        acoes={
          item.userId === eu.id && (
            <Button asChild variant="outline">
              <Link href={`/checkin/${id}/editar`}>
                <Pencil /> Editar
              </Link>
            </Button>
          )
        }
      />
      <div className="space-y-4">
        <CartaoCheckin item={item} euId={eu.id} detalhe />
        <Comentarios
          checkinId={id}
          euId={eu.id}
          donoCheckin={item.userId === eu.id}
          lista={(comentarios ?? []).map((c) => ({
            id: c.id,
            texto: c.texto,
            criadoEm: c.criado_em,
            userId: c.user_id,
            nome: (c.profiles as { nome: string } | null)?.nome ?? "Alguém",
            foto: (c.profiles as { foto_path: string | null } | null)?.foto_path ?? null,
          }))}
        />
      </div>
    </>
  );
}
