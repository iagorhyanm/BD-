"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { entrarNoGrupo } from "@/server/actions/grupos";

export function BotaoEntrar({ codigo }: { codigo: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <Button
      size="lg"
      className="w-full"
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await entrarNoGrupo(codigo);
          if (!r.ok) return void toast.error(r.erro);
          toast.success("Você entrou no desafio! 🔥");
          router.push(`/grupos/${r.dados.id}`);
        })
      }
    >
      {pendente ? "Entrando…" : "Entrar no desafio"}
    </Button>
  );
}
