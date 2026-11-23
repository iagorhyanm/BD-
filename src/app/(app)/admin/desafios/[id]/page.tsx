import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { AdicionarPessoas, MembrosAdmin } from "./gerenciar";

export const metadata: Metadata = { title: "Gerenciar desafio" };

export default async function AdminDesafioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const admin = createAdminClient();
  const { data: g } = await admin.from("grupos").select("id, nome, codigo").eq("id", id).maybeSingle();
  if (!g) notFound();
  const [{ data: membros }, { data: perfis }] = await Promise.all([
    admin.from("grupo_membros").select("user_id, papel, profiles(nome, email, foto_path)").eq("grupo_id", id),
    admin.from("profiles").select("id, nome, email, foto_path").eq("ativo", true).order("nome"),
  ]);
  const dentro = new Set((membros ?? []).map((m) => m.user_id));
  const lista = (membros ?? [])
    .map((m) => {
      const p = m.profiles as { nome: string; email: string | null; foto_path: string | null } | null;
      return { id: m.user_id, papel: m.papel, nome: p?.nome ?? "—", email: p?.email ?? "", foto: p?.foto_path ?? null };
    })
    .sort((a, b) => (a.papel === "dono" ? -1 : b.papel === "dono" ? 1 : a.nome.localeCompare(b.nome, "pt-BR")));
  const fora = (perfis ?? []).filter((p) => !dentro.has(p.id)).map((p) => ({ id: p.id, nome: p.nome, email: p.email ?? "", foto: p.foto_path }));

  return (
    <>
      <CabecalhoPagina
        titulo={g.nome}
        descricao={
          <>
            Código {g.codigo} ·{" "}
            <Link href={`/grupos/${g.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
              ver placar
            </Link>
          </>
        }
        voltar={{ href: "/admin/desafios", rotulo: "Desafios" }}
      />
      <div className="space-y-5">
        <AdicionarPessoas grupoId={g.id} pessoas={fora} />
        <MembrosAdmin grupoId={g.id} membros={lista} />
      </div>
    </>
  );
}
