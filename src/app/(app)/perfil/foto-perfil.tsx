"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AvatarNome } from "@/components/avatar-nome";
import { Button } from "@/components/ui/button";
import { recortarQuadrado } from "@/lib/imagem";
import { createClient } from "@/lib/supabase/client";
import { salvarFoto } from "@/server/actions/perfil";

export function FotoPerfil({ userId, nome, foto }: { userId: string; nome: string; foto: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pendente, iniciar] = useTransition();
  const [enviando, setEnviando] = useState(false);
  const ocupado = pendente || enviando;

  async function escolher(f?: File) {
    if (!f) return;
    setEnviando(true);
    try {
      const blob = await recortarQuadrado(f, 400);
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error } = await createClient().storage.from("avatares").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      const r = await salvarFoto(path);
      if (!r.ok) throw new Error(r.erro);
      toast.success("Foto atualizada!");
      router.refresh();
    } catch {
      toast.error("Não foi possível enviar a foto.");
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={ocupado}
        aria-label={foto ? "Trocar foto de perfil" : "Adicionar foto de perfil"}
        className="relative rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <AvatarNome nome={nome} id={userId} foto={foto} tamanho="xl" />
        <span className="absolute -right-1 -bottom-1 flex size-9 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
          <Camera className="size-4" aria-hidden />
        </span>
        {ocupado && <span className="absolute inset-0 animate-pulse rounded-full bg-background/60" />}
      </button>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => escolher(e.target.files?.[0])} />
      {foto ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={ocupado}
          className="text-muted-foreground"
          onClick={() =>
            iniciar(async () => {
              const r = await salvarFoto(null);
              if (!r.ok) return void toast.error(r.erro);
              toast.success("Foto removida.");
              router.refresh();
            })
          }
        >
          <Trash2 /> Remover foto
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">Toque para pôr sua foto</span>
      )}
    </div>
  );
}
