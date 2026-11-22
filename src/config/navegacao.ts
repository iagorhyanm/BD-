import { BookOpenCheck, House, Settings, Trophy, UserRound, type LucideIcon } from "lucide-react";

export type ItemNav = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Botão de destaque no centro da barra inferior. */
  principal?: boolean;
  somenteAdmin?: boolean;
};

export const NAVEGACAO: ItemNav[] = [
  { href: "/", rotulo: "Início", icone: House },
  { href: "/grupos", rotulo: "Desafios", icone: Trophy },
  { href: "/checkin/novo", rotulo: "Leitura", icone: BookOpenCheck, principal: true },
  { href: "/perfil", rotulo: "Perfil", icone: UserRound },
  { href: "/admin", rotulo: "Admin", icone: Settings, somenteAdmin: true },
];

export function itemAtivo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
