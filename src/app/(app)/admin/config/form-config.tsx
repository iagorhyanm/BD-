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
import { salvarConfig } from "@/server/actions/admin-app";

type Config = { nome: string; slogan: string; boas_vindas: string; aviso_texto: string | null; aviso_ativo: boolean };

export function FormConfig({ config }: { config: Config }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <form
      onSubmit={semReset((fd) => {
        setErro(null);
        iniciar(async () => {
          const r = await salvarConfig(fd);
          if (!r.ok) return setErro(r.erro);
          toast.success("Configurações salvas.");
          router.refresh();
        });
      })}
      className="space-y-5"
    >
      <section className="space-y-4 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Aviso para todos</h2>
        <p className="text-sm text-muted-foreground">Aparece em destaque no Início de todo mundo enquanto estiver ligado.</p>
        <div className="space-y-2">
          <Label htmlFor="cf-aviso">Texto do aviso</Label>
          <Textarea id="cf-aviso" name="aviso_texto" rows={3} maxLength={500} defaultValue={config.aviso_texto ?? ""} placeholder="Ex.: Encontro do grupo sábado às 19h na igreja!" />
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
          <input type="checkbox" name="aviso_ativo" defaultChecked={config.aviso_ativo} className="size-5" />
          Mostrar o aviso
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Textos do app</h2>
        <div className="space-y-2">
          <Label htmlFor="cf-nome">Nome do app</Label>
          <Input id="cf-nome" name="nome" required minLength={2} maxLength={40} defaultValue={config.nome} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-slogan">Frase (aparece no login)</Label>
          <Input id="cf-slogan" name="slogan" maxLength={120} defaultValue={config.slogan} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-boas">Mensagem de boas-vindas (no Início)</Label>
          <Textarea id="cf-boas" name="boas_vindas" rows={2} maxLength={300} defaultValue={config.boas_vindas} />
        </div>
      </section>

      <AlertaErro mensagem={erro} />
      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
