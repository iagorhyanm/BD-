import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { listarFuncoes } from "@/lib/membros";
import { createClient } from "@/lib/supabase/server";
import { formatarDataHora } from "@/lib/datas";
import { ROTULO_TIPO_EVENTO, rotuloPresenca, situacaoFaltas } from "@/lib/dominio";
import { linkLigar, linkWhatsApp } from "@/lib/telefone";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormMembro } from "../form-membro";

export const metadata: Metadata = { title: "Membro" };

export default async function MembroPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: m }, funcoes, { data: resumo }, { data: escalas }, { data: presencas }] = await Promise.all([
    supabase.from("membros").select("*, membro_funcoes(funcao_id), edicoes(limite_faltas)").eq("id", id).maybeSingle(),
    listarFuncoes(true),
    supabase.from("resumo_presenca").select("*").eq("membro_id", id).maybeSingle(),
    supabase
      .from("escalas")
      .select("id, funcoes(nome), eventos!inner(id, titulo, tipo, inicio)")
      .eq("membro_id", id)
      .gte("eventos.inicio", new Date(Date.now() - 6 * 3600 * 1000).toISOString())
      .order("inicio", { referencedTable: "eventos" })
      .limit(10),
    supabase
      .from("presencas")
      .select("status, motivo, eventos!inner(id, titulo, inicio)")
      .eq("membro_id", id)
      .order("atualizado_em", { ascending: false })
      .limit(20),
  ]);
  if (!m) notFound();

  const limite = (m.edicoes as { limite_faltas: number } | null)?.limite_faltas ?? 3;
  const sit = situacaoFaltas(resumo?.faltas ?? 0, limite);
  const whats = linkWhatsApp(m.telefone);
  const ligar = linkLigar(m.telefone);

  return (
    <>
      <CabecalhoPagina titulo={m.nome} voltar={{ href: "/membros", rotulo: "Membros" }} />
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem] [&>*]:min-w-0">
        <div className="order-2 lg:order-1">
          <FormMembro
            funcoes={funcoes}
            membro={{
              id: m.id,
              nome: m.nome,
              sexo: m.sexo,
              nascimento: m.nascimento,
              idade: m.idade,
              telefone: m.telefone,
              cidade: m.cidade,
              nivel: m.nivel,
              observacoes: m.observacoes,
              ativo: m.ativo,
              funcoes: (m.membro_funcoes ?? []).map((f) => f.funcao_id),
              veioDaInscricao: !!m.inscricao_id,
            }}
          />
        </div>
        <aside className="order-1 space-y-4 lg:order-2">
          {(whats || ligar) && (
            <div className="grid grid-cols-2 gap-2">
              {whats && (
                <Button asChild className="bg-[#128c4a] text-white hover:bg-[#0f7a40]">
                  <a href={whats} target="_blank" rel="noopener noreferrer"><MessageCircle /> WhatsApp</a>
                </Button>
              )}
              {ligar && (
                <Button asChild variant="outline"><a href={ligar}><Phone /> Ligar</a></Button>
              )}
            </div>
          )}
          {m.inscricao_id && (
            <Button asChild variant="outline" className="w-full">
              <Link href={`/selecao/${m.inscricao_id}`}>Ver ficha de inscrição</Link>
            </Button>
          )}
          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold">Presença</h2>
            {resumo?.registros ? (
              <>
                <p className="mt-2 text-3xl font-bold">{resumo.percentual}%</p>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-muted-foreground">Presenças</dt><dd className="font-semibold">{resumo.presentes}</dd></div>
                  <div><dt className="text-muted-foreground">Atrasos</dt><dd className="font-semibold">{resumo.atrasos}</dd></div>
                  <div><dt className="text-muted-foreground">Justificadas</dt><dd className="font-semibold">{resumo.justificadas}</dd></div>
                  <div>
                    <dt className="text-muted-foreground">Faltas</dt>
                    <dd className={cn("font-semibold", sit === "passou" && "text-destructive")}>
                      {resumo.faltas} / limite {limite}
                    </dd>
                  </div>
                </dl>
                {sit !== "ok" && (
                  <p className={cn("mt-3 rounded-lg px-3 py-2 text-sm font-medium", sit === "passou" ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900")}>
                    {sit === "passou" ? "Passou do limite de faltas." : "Atingiu o limite de faltas."}
                  </p>
                )}
                <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
                  {(presencas ?? []).slice(0, 6).map((p, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="truncate">{p.eventos.titulo}</span>
                      <span className="shrink-0 text-muted-foreground">{rotuloPresenca(p.status)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Nenhuma chamada registrada ainda.</p>
            )}
          </section>
          <section className="rounded-xl border bg-card p-4">
            <h2 className="font-semibold">Próximas escalas</h2>
            {escalas?.length ? (
              <ul className="mt-2 space-y-2 text-sm">
                {escalas.map((e) => (
                  <li key={e.id}>
                    <Link href={`/agenda/${e.eventos.id}`} className="block rounded-lg p-2 hover:bg-muted">
                      <span className="font-medium">{e.eventos.titulo}</span>
                      <span className="block text-muted-foreground">
                        {ROTULO_TIPO_EVENTO[e.eventos.tipo]} · {formatarDataHora(e.eventos.inicio, "dd/MM HH:mm")} · {e.funcoes?.nome}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Sem escalas futuras.</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
