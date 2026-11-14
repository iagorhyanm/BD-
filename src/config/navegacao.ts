import {
  Bell,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Guitar,
  House,
  ListMusic,
  Settings,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type ItemNav = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Aparece na barra inferior do celular (máx. 4 + "Mais"). */
  barraInferior?: boolean;
  somenteEdg?: boolean;
};

export const NAVEGACAO: ItemNav[] = [
  { href: "/", rotulo: "Início", icone: House, barraInferior: true },
  { href: "/inscricoes", rotulo: "Inscrições", icone: ClipboardList },
  { href: "/selecao", rotulo: "Seleção", icone: UserCheck, barraInferior: true },
  { href: "/membros", rotulo: "Membros", icone: Users, barraInferior: true },
  { href: "/agenda", rotulo: "Agenda e escala", icone: CalendarDays, barraInferior: true },
  { href: "/presenca", rotulo: "Presença", icone: ClipboardCheck },
  { href: "/repertorio", rotulo: "Repertório", icone: ListMusic },
  { href: "/equipamentos", rotulo: "Equipamentos", icone: Guitar },
  { href: "/avisos", rotulo: "Avisos", icone: Bell },
  { href: "/admin", rotulo: "Administração", icone: Settings, somenteEdg: true },
];

export function itemAtivo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
