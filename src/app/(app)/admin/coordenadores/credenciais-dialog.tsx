"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { linkWhatsApp } from "@/lib/telefone";
import type { Credenciais } from "@/server/actions/coordenadores";

/** Mostra login e senha provisória UMA vez, com botões de copiar e enviar por WhatsApp. */
export function CredenciaisDialog({
  credenciais,
  aoFechar,
  titulo = "Login criado!",
}: {
  credenciais: Credenciais | null;
  aoFechar: () => void;
  titulo?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  if (!credenciais) return null;

  const url = typeof window !== "undefined" ? window.location.origin : "";
  const mensagem =
    `Olá, ${credenciais.nome.split(" ")[0]}! Seu acesso ao sistema da Bandinha:\n\n` +
    `🔗 ${url}/login\n👤 Login: ${credenciais.login}\n🔑 Senha provisória: ${credenciais.senha}\n\n` +
    `No primeiro acesso você vai criar a sua senha pessoal.`;
  const whats = linkWhatsApp(credenciais.telefone, mensagem);

  async function copiar() {
    await navigator.clipboard.writeText(mensagem);
    setCopiado(true);
    toast.success("Mensagem copiada!");
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            Anote ou envie agora: a senha provisória não aparece de novo. A pessoa vai trocá-la no primeiro acesso.
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 rounded-xl bg-muted p-4">
          <div>
            <dt className="text-sm text-muted-foreground">Login</dt>
            <dd className="font-mono text-lg font-semibold break-all">{credenciais.login}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Senha provisória</dt>
            <dd className="font-mono text-lg font-semibold tracking-wider">{credenciais.senha}</dd>
          </div>
        </dl>
        <DialogFooter className="gap-2 sm:flex-row">
          <Button variant="outline" onClick={copiar} className="flex-1">
            {copiado ? <Check /> : <Copy />} Copiar mensagem
          </Button>
          {whats && (
            <Button asChild className="flex-1 bg-[#128c4a] text-white hover:bg-[#0f7a40]">
              <a href={whats} target="_blank" rel="noopener noreferrer">
                <MessageCircle /> Enviar no WhatsApp
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
