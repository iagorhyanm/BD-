"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVEGACAO, itemAtivo } from "@/config/navegacao";
import { cn } from "@/lib/utils";

export function BarraInferior({ ehAdmin }: { ehAdmin: boolean }) {
  const pathname = usePathname();
  const itens = NAVEGACAO.filter((i) => !i.somenteAdmin || ehAdmin);

  return (
    <nav
      aria-label="Menu principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="flex">
        {itens.map((item) => {
          const ativo = itemAtivo(pathname, item.href);
          const Icone = item.icone;
          if (item.principal) {
            return (
              <li key={item.href} className="flex flex-1 justify-center">
                <Link
                  href={item.href}
                  aria-current={ativo ? "page" : undefined}
                  className="-mt-5 flex min-h-16 flex-col items-center justify-end gap-1 text-[11px] font-semibold text-primary"
                >
                  <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
                    <Icone className="size-7" aria-hidden />
                  </span>
                  {item.rotulo}
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  ativo ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", ativo && "bg-primary/10")}>
                  <Icone className="size-5" aria-hidden />
                </span>
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
