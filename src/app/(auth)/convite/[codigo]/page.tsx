import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obterSessao } from "@/lib/auth";
import { formatarData } from "@/lib/datas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BotaoEntrar } from "./botao-entrar";

export const metadata: Metadata = { title: "Convite" };

type Previa = { id: string; nome: string; descricao: string | null; inicio: string; fim: string | null; membros: number; encerrado: boolean; ja_participa: boolean };

export default async function ConvitePage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const supabase = await createClient();
  const [{ data }, sessao] = await Promise.all([supabase.rpc("grupo_por_codigo", { p_codigo: codigo }), obterSessao()]);
  const g = data as Previa | null;
  const voltar = encodeURIComponent(`/convite/${codigo}`);

  if (!g) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Convite não encontrado</CardTitle>
          <CardDescription>Confira o link ou peça um novo convite para quem te chamou.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>Você foi convidado(a) para o desafio</CardDescription>
        <CardTitle className="text-2xl">{g.nome}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {g.descricao && <p className="whitespace-pre-line text-muted-foreground">{g.descricao}</p>}
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
            <Users className="size-4" aria-hidden /> {g.membros} {g.membros === 1 ? "participante" : "participantes"}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
            <CalendarDays className="size-4" aria-hidden />
            {g.fim ? `${formatarData(`${g.inicio}T12:00:00Z`, "dd/MM")} a ${formatarData(`${g.fim}T12:00:00Z`, "dd/MM")}` : `Desde ${formatarData(`${g.inicio}T12:00:00Z`, "dd/MM")}`}
          </span>
        </div>
        {g.encerrado ? (
          <p className="rounded-lg bg-muted p-3 text-sm">Este desafio já terminou.</p>
        ) : g.ja_participa ? (
          <Button asChild size="lg" className="w-full">
            <Link href={`/grupos/${g.id}`}>Você já participa — abrir desafio</Link>
          </Button>
        ) : sessao?.perfil ? (
          <BotaoEntrar codigo={codigo} />
        ) : (
          <div className="space-y-2">
            <Button asChild size="lg" className="w-full">
              <Link href={`/cadastro?voltar=${voltar}`}>Criar conta e participar</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/login?voltar=${voltar}`}>Já tenho conta</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
