"use client";

import Link from "next/link";
import { KeyRound, LogOut, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sair } from "@/server/actions/auth";
import { urlFoto } from "@/lib/avatar";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

export function MenuUsuario({ nome, papel, foto }: { nome: string; papel: string; foto?: string | null }) {
  const url = urlFoto(foto);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Minha conta"
        className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-bold text-primary-foreground"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="" className="size-full object-cover" /> : iniciais(nome)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="truncate font-semibold">{nome}</p>
          <p className="text-xs font-normal text-muted-foreground">{papel}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-11">
          <Link href="/perfil">
            <UserRound /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-11">
          <Link href="/trocar-senha">
            <KeyRound /> Trocar senha
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11" onSelect={() => sair()}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
