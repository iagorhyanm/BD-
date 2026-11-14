"use client";

import { semReset } from "@/lib/form";
import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputTelefone } from "@/components/input-telefone";
import { AlertaErro } from "@/components/alerta-erro";
import { criarCoordenador, type Credenciais } from "@/server/actions/coordenadores";
import { CredenciaisDialog } from "./credenciais-dialog";

export function NovoCoordenador() {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [credenciais, setCredenciais] = useState<Credenciais | null>(null);
  const [pendente, iniciar] = useTransition();

  function enviar(formData: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await criarCoordenador(formData);
      if (!r.ok) return setErro(r.erro);
      setAberto(false);
      setCredenciais(r.dados);
    });
  }

  return (
    <>
      <Dialog open={aberto} onOpenChange={(v) => { setAberto(v); setErro(null); }}>
        <DialogTrigger asChild>
          <Button>
            <UserPlus /> Novo coordenador
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo coordenador</DialogTitle>
            <DialogDescription>O sistema gera uma senha provisória automaticamente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={semReset(enviar)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nc-nome">Nome completo</Label>
              <Input id="nc-nome" name="nome" required autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-login">E-mail ou usuário</Label>
              <Input
                id="nc-login"
                name="login"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="maria@email.com ou maria.souza"
                aria-describedby="nc-login-ajuda"
              />
              <p id="nc-login-ajuda" className="text-sm text-muted-foreground">
                Sem e-mail? Use um usuário simples, como <span className="font-mono">maria.souza</span>.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-telefone">Telefone/WhatsApp</Label>
              <InputTelefone id="nc-telefone" name="telefone" />
            </div>
            <AlertaErro mensagem={erro} />
            <Button type="submit" className="w-full" disabled={pendente}>
              {pendente ? "Criando…" : "Criar login"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <CredenciaisDialog credenciais={credenciais} aoFechar={() => setCredenciais(null)} />
    </>
  );
}
