import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Sem conexão" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-destaque/20 text-primary">
          <WifiOff className="size-7" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold">Sem conexão</h1>
        <p className="mt-2 text-muted-foreground">Verifique a internet e tente de novo. O sistema precisa de conexão para mostrar os dados.</p>
        {/* Recarga completa de propósito (sem roteamento do cliente quando offline). */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-medium text-primary-foreground">
          Tentar novamente
        </a>
      </div>
    </main>
  );
}
