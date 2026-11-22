"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { semReset } from "@/lib/form";
import { salvarNome } from "@/server/actions/perfil";

export function EditarNome({ nome }: { nome: string }) {
  const [pendente, iniciar] = useTransition();
  const [valor, setValor] = useState(nome);
  return (
    <form
      className="space-y-2"
      onSubmit={semReset((fd) =>
        iniciar(async () => {
          const r = await salvarNome(fd);
          if (!r.ok) toast.error(r.erro);
          else toast.success("Nome atualizado!");
        }),
      )}
    >
      <Label htmlFor="pf-nome">Seu nome</Label>
      <div className="flex gap-2">
        <Input id="pf-nome" name="nome" value={valor} onChange={(e) => setValor(e.target.value)} maxLength={80} required />
        <Button type="submit" variant="outline" disabled={pendente || valor.trim() === nome}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
