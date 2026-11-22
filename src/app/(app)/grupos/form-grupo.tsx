"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertaErro } from "@/components/alerta-erro";
import { Confirmar } from "@/components/confirmar";
import { semReset } from "@/lib/form";
import { hojeEmBelem, somarDias } from "@/lib/datas";
import { excluirGrupo, salvarGrupo } from "@/server/actions/grupos";
import { cn } from "@/lib/utils";

type G = { id: string; nome: string; descricao: string | null; inicio: string; fim: string | null; ehDono: boolean };

const DURACOES = [
  { dias: 30, rotulo: "30 dias" },
  { dias: 60, rotulo: "60 dias" },
  { dias: 90, rotulo: "90 dias" },
  { dias: 0, rotulo: "Sem fim" },
];

export function FormGrupo({ grupo }: { grupo?: G }) {
  const router = useRouter();
  const [inicio, setInicio] = useState(grupo?.inicio ?? hojeEmBelem());
  const [fim, setFim] = useState(grupo?.fim ?? somarDias(hojeEmBelem(), 89));
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function enviar(fd: FormData) {
    setErro(null);
    fd.set("inicio", inicio);
    fd.set("fim", fim);
    iniciar(async () => {
      const r = await salvarGrupo(grupo?.id ?? null, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success(grupo ? "Desafio salvo!" : "Desafio criado! Agora convide a galera.");
      router.push(`/grupos/${r.dados.id}`);
    });
  }

  return (
    <form onSubmit={semReset(enviar)} className="space-y-5">
      <section className="space-y-4 rounded-2xl border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="g-nome">Nome do desafio</Label>
          <Input id="g-nome" name="nome" required maxLength={80} defaultValue={grupo?.nome} placeholder="Ex.: Novo Testamento em 90 dias" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-desc">Descrição (opcional)</Label>
          <Textarea id="g-desc" name="descricao" rows={3} maxLength={1000} defaultValue={grupo?.descricao ?? ""} placeholder="Meta, plano de leitura, regras…" />
        </div>
      </section>
      <section className="space-y-4 rounded-2xl border bg-card p-4">
        <div className="space-y-2">
          <Label htmlFor="g-inicio">Começa em</Label>
          <Input id="g-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required className="w-48" />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Duração</legend>
          <div className="grid grid-cols-4 gap-2">
            {DURACOES.map((d) => {
              const valor = d.dias ? somarDias(inicio, d.dias - 1) : "";
              const ativo = fim === valor;
              return (
                <button
                  key={d.rotulo}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setFim(valor)}
                  className={cn("min-h-11 rounded-xl border text-sm font-medium", ativo ? "border-primary bg-primary text-primary-foreground" : "bg-background")}
                >
                  {d.rotulo}
                </button>
              );
            })}
          </div>
          <div className="space-y-2 pt-1">
            <Label htmlFor="g-fim" className="text-muted-foreground">ou termina em</Label>
            <Input id="g-fim" type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} className="w-48" />
          </div>
        </fieldset>
      </section>
      <AlertaErro mensagem={erro} />
      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Salvando…" : grupo ? "Salvar" : "Criar desafio"}
      </Button>
      {grupo?.ehDono && (
        <Confirmar
          gatilho={
            <Button type="button" variant="ghost" className="w-full text-destructive">
              <Trash2 /> Excluir desafio
            </Button>
          }
          titulo={`Excluir “${grupo.nome}”?`}
          descricao="O placar e a lista de participantes somem. As leituras de cada pessoa continuam no perfil dela."
          rotuloConfirmar="Excluir"
          destrutivo
          aoConfirmar={async () => {
            const r = await excluirGrupo(grupo.id);
            if (!r.ok) return toast.error(r.erro);
            toast.success("Desafio excluído.");
            router.push("/grupos");
          }}
        />
      )}
    </form>
  );
}
