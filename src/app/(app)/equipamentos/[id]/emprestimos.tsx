"use client";

import { useState, useTransition } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertaErro } from "@/components/alerta-erro";
import { semReset } from "@/lib/form";
import { formatarDataHora, hojeEmBelem } from "@/lib/datas";
import { registrarDevolucao, registrarRetirada } from "@/server/actions/equipamentos";

type Emp = { id: string; quem: string; retirado_em: string; devolvido_em: string | null; observacao: string | null };

export function Emprestimos({ equipamentoId, lista }: { equipamentoId: string; lista: Emp[] }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const aberto = lista.find((e) => !e.devolvido_em);
  const agora = formatarDataHora(new Date(), "HH:mm");

  function retirar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await registrarRetirada(equipamentoId, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success("Retirada registrada.");
    });
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Empréstimos / retiradas</h2>
      {aberto ? (
        <div className="space-y-3 rounded-lg bg-sky-50 p-3 text-sky-950">
          <p>
            Está com <strong>{aberto.quem}</strong> desde {formatarDataHora(aberto.retirado_em, "dd/MM 'às' HH:mm")}.
          </p>
          <Button
            className="w-full"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                const r = await registrarDevolucao(aberto.id, equipamentoId);
                if (!r.ok) return void toast.error(r.erro);
                toast.success("Devolução registrada!");
              })
            }
          >
            <ArrowDownToLine /> Registrar devolução
          </Button>
        </div>
      ) : (
        <form onSubmit={semReset(retirar)} className="space-y-3 rounded-lg bg-muted/60 p-3">
          <div className="space-y-1.5">
            <Label htmlFor="ret-quem">Quem está pegando?</Label>
            <Input id="ret-quem" name="quem" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="ret-data">Data</Label>
              <Input id="ret-data" name="data" type="date" required defaultValue={hojeEmBelem()} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ret-hora">Hora</Label>
              <Input id="ret-hora" name="hora" type="time" required defaultValue={agora} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ret-obs">Observação</Label>
            <Input id="ret-obs" name="observacao" placeholder="Ex.: para o ensaio de sábado" />
          </div>
          <AlertaErro mensagem={erro} />
          <Button type="submit" variant="outline" className="w-full" disabled={pendente}>
            <ArrowUpFromLine /> Registrar retirada
          </Button>
        </form>
      )}
      {lista.length > 0 && (
        <ul className="space-y-2 border-t pt-3 text-sm">
          {lista.map((e) => (
            <li key={e.id}>
              <p className="font-medium">{e.quem}</p>
              <p className="text-muted-foreground">
                Pegou {formatarDataHora(e.retirado_em, "dd/MM/yy HH:mm")}
                {e.devolvido_em ? ` · devolveu ${formatarDataHora(e.devolvido_em, "dd/MM/yy HH:mm")}` : " · não devolvido"}
              </p>
              {e.observacao && <p className="text-muted-foreground italic">{e.observacao}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
