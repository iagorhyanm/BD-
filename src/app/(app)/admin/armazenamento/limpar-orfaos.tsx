"use client";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Confirmar } from "@/components/confirmar";
import { limparArquivosOrfaos } from "@/server/actions/armazenamento";

export function LimparOrfaos({ quantidade }: { quantidade: number }) {
  if (!quantidade) return null;
  return (
    <Confirmar
      gatilho={
        <Button variant="outline">
          <Trash2 /> Apagar {quantidade} arquivo(s) órfão(s)
        </Button>
      }
      titulo="Apagar arquivos órfãos?"
      descricao="Esses arquivos não pertencem a nenhuma inscrição. Esta ação não pode ser desfeita."
      rotuloConfirmar="Apagar"
      destrutivo
      aoConfirmar={async () => {
        const r = await limparArquivosOrfaos();
        if (!r.ok) return toast.error(r.erro);
        toast.success(`${r.dados.apagados} arquivo(s) apagado(s).`);
      }}
    />
  );
}
