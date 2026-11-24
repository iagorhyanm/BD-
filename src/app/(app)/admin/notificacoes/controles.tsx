"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { alternarNotificacao, excluirNotificacao, salvarLembrete } from "@/server/actions/admin-notificacoes";

export function LembreteConfig({ ativo, hora }: { ativo: boolean; hora: string }) {
  const router = useRouter();
  const [a, setA] = useState(ativo);
  const [h, setH] = useState(hora.slice(0, 5));
  const [pendente, iniciar] = useTransition();
  const mudou = a !== ativo || h !== hora.slice(0, 5);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label htmlFor="lb-ativo" className="flex-1 text-sm">
          <span className="block font-medium">Lembrete para quem não leu</span>
          <span className="block text-xs text-muted-foreground">Mensagem automática com a leitura do dia e a sequência da pessoa.</span>
        </label>
        <Switch id="lb-ativo" checked={a} onCheckedChange={setA} />
      </div>
      <div className="flex items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="lb-hora">Horário (Belém)</Label>
          <Input id="lb-hora" type="time" step={300} value={h} onChange={(e) => setH(e.target.value)} className="w-32" disabled={!a} />
        </div>
        <Button
          variant="outline"
          disabled={!mudou || pendente || !h}
          onClick={() =>
            iniciar(async () => {
              const r = await salvarLembrete(a, h);
              if (!r.ok) return void toast.error(r.erro);
              toast.success("Lembrete atualizado.");
              router.refresh();
            })
          }
        >
          {pendente ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

export function AcoesNotificacao({ id, ativa, titulo }: { id: string; ativa: boolean; titulo: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label={ativa ? `Pausar ${titulo}` : `Reativar ${titulo}`}
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await alternarNotificacao(id, !ativa);
            if (!r.ok) return void toast.error(r.erro);
            toast.success(ativa ? "Notificação pausada." : "Notificação reativada.");
            router.refresh();
          })
        }
      >
        {ativa ? <Pause /> : <Play />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Excluir ${titulo}`}
        className="text-destructive"
        disabled={pendente}
        onClick={() => {
          if (!window.confirm(`Excluir a notificação "${titulo}"?`)) return;
          iniciar(async () => {
            const r = await excluirNotificacao(id);
            if (!r.ok) return void toast.error(r.erro);
            toast.success("Notificação excluída.");
            router.refresh();
          });
        }}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
