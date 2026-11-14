"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Trash2, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Confirmar } from "@/components/confirmar";
import { AlertaErro } from "@/components/alerta-erro";
import { STATUS, type StatusInscricao } from "@/lib/inscricao";
import { formatarDataHora } from "@/lib/datas";
import { semReset } from "@/lib/form";
import { alterarStatus, avaliar, excluirInscricao, puxarParaEquipe, removerAvaliacao } from "@/server/actions/selecao";
import { cn } from "@/lib/utils";

export function AcoesInscrito({
  id,
  nome,
  status,
  naEquipe,
}: {
  id: string;
  nome: string;
  status: StatusInscricao;
  naEquipe: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={status}
          disabled={pendente}
          onValueChange={(v) =>
            iniciar(async () => {
              const r = await alterarStatus([id], v as StatusInscricao);
              if (!r.ok) toast.error(r.erro);
              else toast.success("Status atualizado.");
            })
          }
        >
          <SelectTrigger id="status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS.map((s) => (
              <SelectItem key={s.valor} value={s.valor}>
                {s.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {naEquipe ? (
        <p className="flex min-h-11 items-center gap-2 rounded-lg bg-emerald-50 px-3 text-sm font-medium text-emerald-900">
          <UserCheck className="size-4" /> Já está na equipe
          <Link href="/membros" className="ml-auto underline">
            Ver membros
          </Link>
        </p>
      ) : (
        <Button
          className="w-full"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await puxarParaEquipe([id]);
              if (!r.ok) toast.error(r.erro);
              else toast.success(`${nome.split(" ")[0]} agora faz parte da equipe! 🎶`);
            })
          }
        >
          <UserPlus /> Puxar para a equipe
        </Button>
      )}

      <Confirmar
        gatilho={
          <Button variant="ghost" className="w-full text-destructive">
            <Trash2 /> Excluir inscrição
          </Button>
        }
        titulo={`Excluir a inscrição de ${nome}?`}
        descricao="Os dados pessoais são apagados definitivamente (LGPD). O log guarda só o nome. Se a pessoa já foi puxada para a equipe, o cadastro de membro continua."
        rotuloConfirmar="Excluir"
        destrutivo
        aoConfirmar={async () => {
          const r = await excluirInscricao(id);
          if (!r.ok) return toast.error(r.erro);
          toast.success("Inscrição excluída.");
          router.push("/selecao");
        }}
      />
    </section>
  );
}

type Avaliacao = { nota: number; comentario: string | null; atualizado_em: string; autor: string; minha: boolean };

export function Avaliacoes({ inscricaoId, avaliacoes }: { inscricaoId: string; avaliacoes: Avaliacao[] }) {
  const minha = avaliacoes.find((a) => a.minha);
  const [nota, setNota] = useState(minha?.nota ?? 0);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const media = avaliacoes.length ? avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length : null;

  function enviar(fd: FormData) {
    setErro(null);
    fd.set("nota", String(nota));
    iniciar(async () => {
      const r = await avaliar(inscricaoId, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success("Avaliação salva!");
    });
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Avaliações</h2>
        {media !== null && (
          <p className="flex items-center gap-1 text-lg font-bold">
            <Star className="size-5 fill-destaque text-destaque" aria-hidden />
            {media.toFixed(1).replace(".", ",")}
            <span className="text-sm font-normal text-muted-foreground">média de {avaliacoes.length}</span>
          </p>
        )}
      </div>

      <form onSubmit={semReset(enviar)} className="space-y-3 rounded-lg bg-muted/60 p-3">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{minha ? "Sua nota" : "Dê sua nota"}</legend>
          <div className="flex gap-1" role="radiogroup" aria-label="Nota de 1 a 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={nota === n}
                aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
                onClick={() => setNota(n)}
                className="flex size-11 items-center justify-center rounded-lg hover:bg-background"
              >
                <Star className={cn("size-7", n <= nota ? "fill-destaque text-destaque" : "text-muted-foreground")} />
              </button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-1.5">
          <Label htmlFor="comentario">Comentário</Label>
          <Textarea id="comentario" name="comentario" rows={3} defaultValue={minha?.comentario ?? ""} placeholder="Afinação, presença, disponibilidade…" />
        </div>
        <AlertaErro mensagem={erro} />
        <div className="flex gap-2">
          <Button type="submit" disabled={pendente || nota === 0} className="flex-1">
            {pendente ? "Salvando…" : minha ? "Atualizar avaliação" : "Salvar avaliação"}
          </Button>
          {minha && (
            <Button
              type="button"
              variant="ghost"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await removerAvaliacao(inscricaoId);
                  if (r.ok) {
                    setNota(0);
                    toast.success("Avaliação removida.");
                  }
                })
              }
            >
              Remover
            </Button>
          )}
        </div>
      </form>

      {avaliacoes.length > 0 ? (
        <ul className="space-y-3">
          {avaliacoes.map((a, idx) => (
            <li key={idx} className="border-t pt-3 first:border-0 first:pt-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  {a.autor}
                  {a.minha && <span className="font-normal text-muted-foreground"> (você)</span>}
                </p>
                <p className="flex items-center gap-0.5 text-sm font-semibold" aria-label={`Nota ${a.nota}`}>
                  <Star className="size-4 fill-destaque text-destaque" aria-hidden /> {a.nota}
                </p>
              </div>
              {a.comentario && <p className="mt-1 text-sm whitespace-pre-line">{a.comentario}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{formatarDataHora(a.atualizado_em)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Ninguém avaliou ainda.</p>
      )}
    </section>
  );
}
