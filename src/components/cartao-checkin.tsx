import Link from "next/link";
import { BookOpen, Clock, MessageCircle } from "lucide-react";
import { AvatarNome } from "@/components/avatar-nome";
import { Reacoes } from "@/components/reacoes";
import { rotuloDia } from "@/lib/datas";
import type { ItemFeed } from "@/lib/feed";

export function CartaoCheckin({ item, euId, detalhe = false }: { item: ItemFeed; euId: string; detalhe?: boolean }) {
  const meu = item.userId === euId;
  return (
    <article className="space-y-3 rounded-2xl border bg-card p-4">
      <header className="flex items-center gap-3">
        <AvatarNome nome={item.nome} id={item.userId} foto={item.fotoPerfil} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {meu ? "Você" : item.nome}
          </p>
          <p className="text-sm text-muted-foreground">
            Leitura de {rotuloDia(item.data)}
            {!item.noPrazo && <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">marcada depois</span>}
          </p>
        </div>
      </header>

      <Link href={`/checkin/${item.id}`} className="block space-y-3">
        <p className="flex items-start gap-2 text-lg font-bold text-primary">
          <BookOpen className="mt-1 size-5 shrink-0" aria-hidden />
          <span className="min-w-0">
            {item.leitura}
            {item.tituloDia && <span className="block text-xs font-medium text-muted-foreground">{item.tituloDia}</span>}
          </span>
          {item.minutos && (
            <span className="ml-auto flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Clock className="size-4" aria-hidden /> {item.minutos} min
            </span>
          )}
        </p>
        {item.foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.foto} alt="Foto da leitura" loading="lazy" className="max-h-96 w-full rounded-xl bg-muted object-cover" />
        )}
        {item.versiculo && (
          <blockquote className="border-l-4 border-destaque pl-3 text-[15px] italic">“{item.versiculo}”</blockquote>
        )}
        {item.anotacao && (
          <p className={detalhe ? "whitespace-pre-line" : "line-clamp-4 whitespace-pre-line"}>{item.anotacao}</p>
        )}
      </Link>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <Reacoes checkinId={item.id} iniciais={item.reacoes} atualizarPagina={detalhe} />
        {!detalhe && item.userId === euId && item.reacoes.length > 0 && (
          <Link href={`/checkin/${item.id}#reacoes`} className="flex min-h-9 items-center rounded-full px-2 text-sm font-medium text-primary hover:bg-muted">
            Ver quem reagiu
          </Link>
        )}
        {!detalhe && (
          <Link
            href={`/checkin/${item.id}#comentarios`}
            className="flex min-h-9 items-center gap-1.5 rounded-full px-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <MessageCircle className="size-4" aria-hidden />
            {item.comentarios > 0 ? item.comentarios : "Comentar"}
          </Link>
        )}
      </footer>
    </article>
  );
}
