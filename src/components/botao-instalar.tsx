"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { ABRIR_INSTALAR } from "@/components/instalar-app";

/** Atalho no Perfil para abrir o pop-up de instalação (some se o app já está instalado). */
export function BotaoInstalar() {
  const [mostrar, setMostrar] = useState(false);
  useEffect(() => {
    const instalado =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setMostrar(!instalado);
  }, []);
  if (!mostrar) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(ABRIR_INSTALAR))}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left font-semibold"
    >
      <Smartphone className="size-5 text-primary" aria-hidden />
      <span className="flex-1">
        Instalar o app no celular
        <span className="block text-sm font-normal text-muted-foreground">Na tela de início, abre com um toque</span>
      </span>
    </button>
  );
}
