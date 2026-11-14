"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAVEGACAO, itemAtivo } from "@/config/navegacao";
import { cn } from "@/lib/utils";
import { tema } from "@/theme.config";

export function MenuLateral({ ehEdg }: { ehEdg: boolean }) {
  const pathname = usePathname();
  const itens = NAVEGACAO.filter((i) => !i.somenteEdg || ehEdg);

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <Link href="/" className="flex items-center gap-3 px-5 py-5">
        <Image src={tema.logo} alt="" width={40} height={40} className="size-10" />
        <div className="leading-tight">
          <p className="font-bold">{tema.nomeCurto}</p>
          <p className="text-xs text-sidebar-foreground/70">EJC Marabá</p>
        </div>
      </Link>
      <nav aria-label="Menu principal" className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
        {itens.map((item) => {
          const ativo = itemAtivo(pathname, item.href);
          const Icone = item.icone;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                ativo
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <Icone className="size-5 shrink-0" aria-hidden />
              {item.rotulo}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
