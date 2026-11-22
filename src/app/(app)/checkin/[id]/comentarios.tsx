"use client";

import { useRef, useState, useTransition } from "react";
import { Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AvatarNome } from "@/components/avatar-nome";
import { formatarDataHora } from "@/lib/datas";
import { comentar, excluirComentario } from "@/server/actions/checkins";

type C = { id: string; texto: string; criadoEm: string; userId: string; nome: string };

export function Comentarios({ checkinId, euId, donoCheckin, lista }: { checkinId: string; euId: string; donoCheckin: boolean; lista: C[] }) {
  const [pendente, iniciar] = useTransition();
  const [texto, setTexto] = useState("");
  const form = useRef<HTMLFormElement>(null);

  return (
    <section id="comentarios" className="space-y-3 rounded-2xl border bg-card p-4">
      <h2 className="font-semibold">Comentários ({lista.length})</h2>
      {lista.length === 0 && <p className="text-sm text-muted-foreground">Seja o primeiro a incentivar! 🙌</p>}
      <ul className="space-y-3">
        {lista.map((c) => (
          <li key={c.id} className="flex gap-3">
            <AvatarNome nome={c.nome} id={c.userId} tamanho="sm" />
            <div className="min-w-0 flex-1 rounded-xl bg-muted px-3 py-2">
              <p className="text-sm font-semibold">{c.userId === euId ? "Você" : c.nome}</p>
              <p className="text-[15px] whitespace-pre-line">{c.texto}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatarDataHora(c.criadoEm, "dd/MM HH:mm")}</p>
            </div>
            {(c.userId === euId || donoCheckin) && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Excluir comentário"
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    const r = await excluirComentario(c.id, checkinId);
                    if (!r.ok) toast.error(r.erro);
                  })
                }
              >
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form
        ref={form}
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          iniciar(async () => {
            const r = await comentar(checkinId, fd);
            if (!r.ok) return void toast.error(r.erro);
            setTexto("");
          });
        }}
      >
        <Textarea
          name="texto"
          rows={1}
          maxLength={1000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva um comentário…"
          aria-label="Comentário"
          className="min-h-11"
        />
        <Button type="submit" size="icon" disabled={pendente || !texto.trim()} aria-label="Enviar comentário">
          <Send />
        </Button>
      </form>
    </section>
  );
}
