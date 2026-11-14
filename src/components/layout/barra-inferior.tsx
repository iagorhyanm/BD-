"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { NAVEGACAO, itemAtivo } from "@/config/navegacao";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function BarraInferior({ ehEdg }: { ehEdg: boolean }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const itens = NAVEGACAO.filter((i) => !i.somenteEdg || ehEdg);
  const principais = itens.filter((i) => i.barraInferior);
  const demais = itens.filter((i) => !i.barraInferior);
  const algumDosDemaisAtivo = demais.some((i) => itemAtivo(pathname, i.href));

  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {principais.map((item) => {
          const ativo = itemAtivo(pathname, item.href);
          const Icone = item.icone;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  ativo ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    ativo && "bg-destaque/25",
                  )}
                >
                  <Icone className="size-5" aria-hidden />
                </span>
                {item.rotulo.split(" ")[0]}
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet open={aberto} onOpenChange={setAberto}>
            <SheetTrigger
              className={cn(
                "flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium",
                algumDosDemaisAtivo ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full",
                  algumDosDemaisAtivo && "bg-destaque/25",
                )}
              >
                <Menu className="size-5" aria-hidden />
              </span>
              Mais
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <SheetHeader>
                <SheetTitle>Mais opções</SheetTitle>
              </SheetHeader>
              <ul className="grid grid-cols-3 gap-2 px-4">
                {demais.map((item) => {
                  const Icone = item.icone;
                  const ativo = itemAtivo(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setAberto(false)}
                        aria-current={ativo ? "page" : undefined}
                        className={cn(
                          "flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center text-xs font-medium",
                          ativo ? "border-primary bg-primary/5 text-primary" : "bg-card",
                        )}
                      >
                        <Icone className="size-6" aria-hidden />
                        {item.rotulo}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
