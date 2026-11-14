"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Confirmar } from "@/components/confirmar";
import { excluirEvento } from "@/server/actions/eventos";

export function ExcluirEvento({ id, titulo }: { id: string; titulo: string }) {
  const router = useRouter();
  return (
    <Confirmar
      gatilho={
        <Button variant="ghost" className="w-full text-destructive">
          <Trash2 /> Excluir evento
        </Button>
      }
      titulo={`Excluir “${titulo}”?`}
      descricao="Apaga também a escala, a chamada e o checklist deste evento. A setlist vinculada continua existindo, sem evento."
      rotuloConfirmar="Excluir"
      destrutivo
      aoConfirmar={async () => {
        const r = await excluirEvento(id);
        if (!r.ok) return toast.error(r.erro);
        toast.success("Evento excluído.");
        router.push("/agenda");
      }}
    />
  );
}
