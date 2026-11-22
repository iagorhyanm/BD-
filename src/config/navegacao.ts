import { BookOpenCheck, CalendarDays, House, Settings, Trophy, UserRound, type LucideIcon } from "lucide-react";

export type ItemNav = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Botão de destaque no centro da barra inferior. */
  principal?: boolean;
  somenteAdmin?: boolean;
  /** Só no menu lateral (computador). No celular fica no Perfil. */
  soMenuLateral?: boolean;
};

export const NAVEGACAO: ItemNav[] = [
  { href: "/", rotulo: "Início", icone: House },
  { href: "/grupos", rotulo: "Desafios", icone: Trophy },
  { href: "/checkin/novo", rotulo: "Leitura", icone: BookOpenCheck, principal: true },
  { href: "/plano", rotulo: "Plano", icone: CalendarDays },
  { href: "/perfil", rotulo: "Perfil", icone: UserRound },
  { href: "/admin", rotulo: "Admin", icone: Settings, somenteAdmin: true, soMenuLateral: true },
];

export function itemAtivo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
