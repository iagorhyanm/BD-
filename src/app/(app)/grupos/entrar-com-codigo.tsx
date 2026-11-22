"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertaErro } from "@/components/alerta-erro";
import { entrarNoGrupo } from "@/server/actions/grupos";

export function EntrarComCodigo() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <>
      <Button variant="outline" onClick={() => setAberto(true)}>
        <Ticket /> Tenho um código
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrar num desafio</DialogTitle>
            <DialogDescription>Digite o código de convite que recebeu.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setErro(null);
              iniciar(async () => {
                const r = await entrarNoGrupo(codigo);
                if (!r.ok) return setErro(r.erro);
                router.push(`/grupos/${r.dados.id}`);
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                maxLength={12}
                autoCapitalize="characters"
                autoComplete="off"
                className="text-center font-mono text-xl tracking-[0.3em]"
                placeholder="ABCD2345"
                required
              />
            </div>
            <AlertaErro mensagem={erro} />
            <Button type="submit" className="w-full" disabled={pendente || codigo.length < 6}>
              {pendente ? "Entrando…" : "Entrar no desafio"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
