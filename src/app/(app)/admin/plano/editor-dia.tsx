"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertaErro } from "@/components/alerta-erro";
import { Confirmar } from "@/components/confirmar";
import { semReset } from "@/lib/form";
import { interpretarLeitura, formatarReferencias } from "@/lib/plano";
import { excluirDiaPlano, salvarDiaPlano } from "@/server/actions/admin-app";

export type Dia = { data: string; leitura: string; titulo: string | null; texto: string | null; marcados: number };

export function EditorDia({ dia, dataSugerida }: { dia?: Dia; dataSugerida?: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [leitura, setLeitura] = useState(dia?.leitura ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const previa = leitura.trim() ? interpretarLeitura(leitura) : null;

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarDiaPlano(dia?.data ?? null, fd);
      if (!r.ok) return setErro(r.erro);
      toast.success("Plano atualizado.");
      setAberto(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {dia ? (
          <Button variant="ghost" size="icon" aria-label={`Editar ${dia.data}`}>
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline">
            <Plus /> Adicionar dia
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dia ? "Editar leitura do dia" : "Adicionar dia ao plano"}</DialogTitle>
          <DialogDescription>Escreva a leitura como “Gênesis 1 a 3” ou “Sl 23; Mt 5”.</DialogDescription>
        </DialogHeader>
        <form onSubmit={semReset(enviar)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pd-data">Data</Label>
            <Input id="pd-data" name="data" type="date" required defaultValue={dia?.data ?? dataSugerida} />
            {dia && dia.marcados > 0 && (
              <p className="text-xs text-muted-foreground">
                {dia.marcados} {dia.marcados === 1 ? "pessoa já marcou" : "pessoas já marcaram"} este dia. Se mudar a data, as marcações vão junto.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-leitura">Leitura</Label>
            <Input id="pd-leitura" name="leitura" required maxLength={300} value={leitura} onChange={(e) => setLeitura(e.target.value)} />
            {previa && (
              <p className={previa.erro ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                {previa.erro ?? `Entendi: ${formatarReferencias(previa.referencias)}`}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-titulo">Título (opcional)</Label>
            <Input id="pd-titulo" name="titulo" maxLength={150} defaultValue={dia?.titulo ?? ""} placeholder="Ex.: A criação" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pd-texto">Texto de apoio / devocional (opcional)</Label>
            <Textarea id="pd-texto" name="texto" rows={5} maxLength={5000} defaultValue={dia?.texto ?? ""} />
          </div>
          <AlertaErro mensagem={erro} />
          <Button type="submit" className="w-full" disabled={pendente || !!previa?.erro}>
            {pendente ? "Salvando…" : "Salvar"}
          </Button>
          {dia && (
            <Confirmar
              gatilho={
                <Button type="button" variant="ghost" className="w-full text-destructive" disabled={dia.marcados > 0}>
                  <Trash2 /> {dia.marcados > 0 ? "Não dá para excluir (já tem leituras marcadas)" : "Excluir este dia"}
                </Button>
              }
              titulo="Excluir este dia do plano?"
              rotuloConfirmar="Excluir"
              destrutivo
              aoConfirmar={async () => {
                const r = await excluirDiaPlano(dia.data);
                if (!r.ok) return void toast.error(r.erro);
                toast.success("Dia removido.");
                setAberto(false);
                router.refresh();
              }}
            />
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
