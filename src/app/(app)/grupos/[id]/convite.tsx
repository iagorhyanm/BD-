"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function Convite({ codigo, nome, url }: { codigo: string; nome: string; url: string }) {
  const [copiado, setCopiado] = useState(false);
  const texto = `📖🔥 Bora ler a Bíblia comigo no desafio “${nome}” no BibleRats! Entre por aqui: ${url} (código ${codigo})`;

  async function compartilhar() {
    if (navigator.share) {
      try {
        await navigator.share({ title: nome, text: texto, url });
        return;
      } catch {
        /* cancelado: cai no WhatsApp */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  }

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">Código de convite</p>
        <p className="font-mono text-2xl font-bold tracking-[0.2em]">{codigo}</p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            toast.success("Link copiado!");
            setTimeout(() => setCopiado(false), 2000);
          }}
        >
          {copiado ? <Check /> : <Copy />} Copiar link
        </Button>
        <Button onClick={compartilhar}>
          <Share2 /> Convidar
        </Button>
      </div>
    </section>
  );
}
