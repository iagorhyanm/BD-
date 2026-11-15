import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, MessageCircle, Phone } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatarData, formatarDataHora } from "@/lib/datas";
import { ROTULO_SEXO, formatarResposta, lerVideo, type Pergunta, type Resposta } from "@/lib/inscricao";
import { linkLigar, linkWhatsApp, mascararTelefone } from "@/lib/telefone";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Button } from "@/components/ui/button";
import { AcoesInscrito, Avaliacoes } from "./ficha-client";

export const metadata: Metadata = { title: "Ficha do inscrito" };

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const eu = await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: i }, { data: avaliacoes }] = await Promise.all([
    supabase
      .from("inscricoes")
      .select("*, formularios(titulo, perguntas(id, tipo, rotulo, ajuda, opcoes, obrigatoria, ordem)), membros(id)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("avaliacoes")
      .select("nota, comentario, atualizado_em, coordenador_id, profiles(nome)")
      .eq("inscricao_id", id)
      .order("atualizado_em", { ascending: false }),
  ]);
  if (!i) notFound();

  const perguntas: Pergunta[] = [...(i.formularios?.perguntas ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((p) => ({ ...p, opcoes: (p.opcoes as string[]) ?? [] }));
  const respostas = (i.respostas ?? {}) as Record<string, Resposta>;

  // Selfie e vídeo: URLs temporárias (1h) do bucket privado.
  const midias: { pergunta: Pergunta; tipo: "foto" | "video-arquivo" | "video-link"; url: string }[] = [];
  const arquivos: { pergunta: Pergunta; tipo: "foto" | "video-arquivo"; path: string }[] = [];
  for (const p of perguntas) {
    const v = respostas[p.id];
    if (p.tipo === "foto" && typeof v === "string") arquivos.push({ pergunta: p, tipo: "foto", path: v });
    if (p.tipo === "video") {
      const vid = lerVideo(v);
      if (vid?.tipo === "arquivo") arquivos.push({ pergunta: p, tipo: "video-arquivo", path: vid.path });
      else if (vid?.tipo === "link") midias.push({ pergunta: p, tipo: "video-link", url: vid.url });
    }
  }
  if (arquivos.length) {
    // Uma única chamada para todas as URLs temporárias.
    const { data } = await supabase.storage.from("inscricoes").createSignedUrls(arquivos.map((a) => a.path), 3600);
    const porCaminho = new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
    for (const a of arquivos) {
      const url = porCaminho.get(a.path);
      if (url) midias.unshift({ pergunta: a.pergunta, tipo: a.tipo, url });
    }
  }
  midias.sort((a, b) => perguntas.indexOf(a.pergunta) - perguntas.indexOf(b.pergunta));
  const perguntasTexto = perguntas.filter((p) => p.tipo !== "foto" && p.tipo !== "video");
  const membro = Array.isArray(i.membros) ? i.membros[0] : i.membros;
  const whats = linkWhatsApp(i.telefone, `Olá, ${i.nome.split(" ")[0]}! Aqui é da coordenação da Bandinha do EJC. 🎶`);
  const ligar = linkLigar(i.telefone);

  const lista = (avaliacoes ?? []).map((a) => ({
    nota: a.nota,
    comentario: a.comentario,
    atualizado_em: a.atualizado_em,
    autor: (a.profiles as { nome: string } | null)?.nome ?? "—",
    minha: a.coordenador_id === eu.id,
  }));

  return (
    <>
      <CabecalhoPagina
        titulo={i.nome}
        voltar={{ href: `/selecao?aba=${i.sexo}`, rotulo: "Seleção" }}
        descricao={`${i.idade} anos · ${i.cidade} · ${ROTULO_SEXO[i.sexo]}`}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem] [&>*]:min-w-0">
        <div className="space-y-4">
          {midias.length > 0 && (
            <section className="grid gap-3 sm:grid-cols-2">
              {midias.map((m) => (
                <figure key={m.pergunta.id} className="overflow-hidden rounded-xl border bg-card">
                  {m.tipo === "foto" && (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir selfie em tamanho real">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt={`Selfie de ${i.nome}`} className="aspect-square w-full bg-muted object-cover" />
                    </a>
                  )}
                  {m.tipo === "video-arquivo" && (
                    <video src={m.url} controls playsInline preload="metadata" className="aspect-square w-full bg-black object-contain">
                      Seu navegador não reproduz este vídeo.{" "}
                      <a href={m.url}>Baixar vídeo</a>
                    </video>
                  )}
                  {m.tipo === "video-link" && (
                    <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 bg-muted p-4 text-center">
                      <p className="text-sm text-muted-foreground">O vídeo foi enviado como link:</p>
                      <Button asChild>
                        <a href={m.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink /> Abrir vídeo
                        </a>
                      </Button>
                      <p className="text-xs break-all text-muted-foreground">{m.url}</p>
                    </div>
                  )}
                  <figcaption className="px-3 py-2 text-sm font-medium">{m.pergunta.rotulo}</figcaption>
                </figure>
              ))}
            </section>
          )}

          <div className="grid grid-cols-2 gap-2">
            {whats && (
              <Button asChild size="lg" className="bg-[#128c4a] text-white hover:bg-[#0f7a40]">
                <a href={whats} target="_blank" rel="noopener noreferrer">
                  <MessageCircle /> WhatsApp
                </a>
              </Button>
            )}
            {ligar && (
              <Button asChild size="lg" variant="outline">
                <a href={ligar}>
                  <Phone /> Ligar
                </a>
              </Button>
            )}
          </div>

          <section className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 font-semibold">Dados</h2>
            <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <Item rotulo="Telefone" valor={mascararTelefone(i.telefone)} />
              <Item rotulo="Nascimento" valor={`${formatarData(`${i.nascimento}T12:00:00Z`)} (${i.idade} anos)`} />
              <Item rotulo="Sexo" valor={ROTULO_SEXO[i.sexo]} />
              <Item rotulo="Cidade" valor={i.cidade} />
              <Item
                rotulo="Já trabalhou no EJC?"
                valor={i.ja_trabalhou ? `Sim — ${i.equipe_anterior} (${i.ano_anterior})` : "Não"}
              />
              <Item rotulo="Inscrito em" valor={formatarDataHora(i.criado_em)} />
              <Item rotulo="Formulário" valor={i.formularios?.titulo ?? "—"} />
              <Item rotulo="Consentimento LGPD" valor={`Aceito em ${formatarDataHora(i.consentimento_em)}`} />
            </dl>
          </section>

          {i.resp_nome && (
            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 font-semibold">Responsável (menor de idade)</h2>
              <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                <Item rotulo="Nome" valor={i.resp_nome} />
                <Item
                  rotulo="Telefone"
                  valor={
                    i.resp_telefone ? (
                      <a className="text-primary underline" href={linkWhatsApp(i.resp_telefone) ?? "#"} target="_blank" rel="noopener noreferrer">
                        {mascararTelefone(i.resp_telefone)}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <Item rotulo="Autorização" valor={i.resp_consentimento ? "Autorizado" : "—"} />
              </dl>
            </section>
          )}

          {perguntasTexto.length > 0 && (
            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-3 font-semibold">Respostas</h2>
              <dl className="space-y-3">
                {perguntasTexto.map((p) => (
                  <div key={p.id}>
                    <dt className="text-sm text-muted-foreground">{p.rotulo}</dt>
                    <dd className="whitespace-pre-line">{formatarResposta(p, respostas[p.id]) || <span className="text-muted-foreground">—</span>}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <AcoesInscrito id={i.id} nome={i.nome} status={i.status} naEquipe={!!membro} />
          <Avaliacoes inscricaoId={i.id} avaliacoes={lista} />
        </div>
      </div>
    </>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}
