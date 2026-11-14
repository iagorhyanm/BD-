"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertaErro } from "@/components/alerta-erro";
import { semReset } from "@/lib/form";
import { hojeEmBelem } from "@/lib/datas";
import type { TipoEvento } from "@/lib/dominio";
import { salvarEvento } from "@/server/actions/eventos";

export type EventoForm = {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  local: string | null;
  pauta: string | null;
};

export function FormEvento({ evento }: { evento?: EventoForm }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [tipo, setTipo] = useState<TipoEvento>(evento?.tipo ?? "ensaio");

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarEvento(evento?.id ?? null, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success(evento ? "Evento salvo!" : "Evento criado!");
      router.push(`/agenda/${r.dados.id}`);
    });
  }

  return (
    <form onSubmit={semReset(enviar)} className="space-y-4 rounded-xl border bg-card p-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Tipo</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["ensaio", "Ensaio"],
              ["apresentacao", "Apresentação"],
            ] as const
          ).map(([v, r]) => (
            <label key={v} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-background px-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
              <input type="radio" name="tipo" value={v} checked={tipo === v} onChange={() => setTipo(v)} className="size-5 accent-[var(--primary)]" />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="ev-titulo">Título</Label>
        <Input id="ev-titulo" name="titulo" required defaultValue={evento?.titulo ?? ""} placeholder={tipo === "ensaio" ? "Ensaio geral" : "Missa de abertura"} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="col-span-2 space-y-2 sm:col-span-1">
          <Label htmlFor="ev-data">Data</Label>
          <Input id="ev-data" name="data" type="date" required defaultValue={evento?.data ?? hojeEmBelem()} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-ini">Início</Label>
          <Input id="ev-ini" name="hora_inicio" type="time" required defaultValue={evento?.hora_inicio ?? "15:00"} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ev-fim">Término</Label>
          <Input id="ev-fim" name="hora_fim" type="time" defaultValue={evento?.hora_fim ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ev-local">Local</Label>
        <Input id="ev-local" name="local" defaultValue={evento?.local ?? ""} placeholder="Ex.: Salão paroquial" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ev-pauta">Pauta</Label>
        <Textarea id="ev-pauta" name="pauta" rows={5} defaultValue={evento?.pauta ?? ""} placeholder="O que vai ser trabalhado, avisos, etc." />
      </div>
      <AlertaErro mensagem={erro} />
      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pendente}>
        {pendente ? "Salvando…" : evento ? "Salvar evento" : "Criar evento"}
      </Button>
    </form>
  );
}
