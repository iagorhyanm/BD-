import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CalendarClock, Lock } from "lucide-react";
import { createPublicClient, urlCapa } from "@/lib/supabase/publico";
import { formatarDataHora } from "@/lib/datas";
import type { Pergunta, Situacao } from "@/lib/inscricao";
import { tema } from "@/theme.config";
import { FormularioPublico } from "./formulario-publico";

export const dynamic = "force-dynamic";

type FormPublico = {
  id: string;
  slug: string;
  titulo: string;
  descricao: string | null;
  capa_path: string | null;
  abre_em: string | null;
  fecha_em: string | null;
  msg_confirmacao: string;
  texto_lgpd: string;
  situacao: Situacao;
  perguntas: Pergunta[];
};

const carregar = cache(async (slug: string) => {
  const { data } = await createPublicClient().rpc("formulario_publico", { p_slug: slug });
  return data as FormPublico | null;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const f = await carregar((await params).slug);
  if (!f) return { title: "Inscrição" };
  const capa = urlCapa(f.capa_path);
  return {
    title: f.titulo,
    description: f.descricao ?? tema.descricao,
    openGraph: { title: f.titulo, description: f.descricao ?? undefined, images: capa ? [capa] : undefined },
  };
}

export default async function InscricaoPublicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const f = await carregar((await params).slug);
  if (!f) notFound();
  const capa = urlCapa(f.capa_path);

  return (
    <main className="min-h-dvh bg-background pb-16">
      <header className="relative bg-primary text-primary-foreground">
        {capa ? (
          <div className="relative mx-auto aspect-[3/1] max-h-72 w-full max-w-3xl overflow-hidden sm:rounded-b-2xl">
            <Image src={capa} alt="" fill priority sizes="(max-width: 768px) 100vw, 768px" className="object-cover" />
          </div>
        ) : (
          <div className="h-24" aria-hidden />
        )}
      </header>

      <div className="mx-auto -mt-10 max-w-2xl px-4">
        <div className="relative rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Image src={tema.logo} alt="" width={28} height={28} className="size-7" />
            {tema.nome}
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{f.titulo}</h1>
          {f.descricao && <p className="mt-2 whitespace-pre-line text-muted-foreground">{f.descricao}</p>}
        </div>

        <div className="mt-4">
          {f.situacao === "aberto" ? (
            <FormularioPublico
              slug={f.slug}
              perguntas={f.perguntas}
              textoLgpd={f.texto_lgpd}
              carregadoEm={Date.now()}
            />
          ) : (
            <Indisponivel situacao={f.situacao} abreEm={f.abre_em} />
          )}
        </div>
      </div>
    </main>
  );
}

function Indisponivel({ situacao, abreEm }: { situacao: Situacao; abreEm: string | null }) {
  const textos: Record<Exclude<Situacao, "aberto">, { titulo: string; texto: string }> = {
    fechado: { titulo: "Inscrições fechadas", texto: "No momento este formulário não está recebendo inscrições." },
    agendado: {
      titulo: "Inscrições em breve",
      texto: abreEm ? `As inscrições abrem em ${formatarDataHora(abreEm, "dd/MM 'às' HH:mm")}.` : "As inscrições ainda não abriram.",
    },
    encerrado: { titulo: "Inscrições encerradas", texto: "O prazo de inscrição terminou. Obrigado pelo interesse! 🙏" },
    esgotado: { titulo: "Vagas de inscrição esgotadas", texto: "O limite de inscrições foi atingido. Obrigado pelo interesse! 🙏" },
  };
  const t = textos[situacao as Exclude<Situacao, "aberto">];
  const Icone = situacao === "agendado" ? CalendarClock : Lock;
  return (
    <div className="flex flex-col items-center rounded-2xl border bg-card px-6 py-10 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-destaque/20 text-primary">
        <Icone className="size-7" aria-hidden />
      </div>
      <h2 className="text-xl font-semibold">{t.titulo}</h2>
      <p className="mt-2 max-w-sm text-muted-foreground">{t.texto}</p>
    </div>
  );
}
