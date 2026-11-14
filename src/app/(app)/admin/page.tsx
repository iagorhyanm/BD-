import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, ChevronRight, History, Users } from "lucide-react";
import { requireEdg } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";

export const metadata: Metadata = { title: "Administração" };

const SECOES = [
  {
    href: "/admin/coordenadores",
    titulo: "Coordenadores",
    descricao: "Criar logins, redefinir senhas, ativar/desativar e promover a EDG.",
    icone: Users,
  },
  {
    href: "/admin/edicoes",
    titulo: "Edições e configurações",
    descricao: "Edições do EJC, vagas por sexo, limite de faltas e texto LGPD.",
    icone: CalendarRange,
  },
  {
    href: "/admin/logs",
    titulo: "Log de atividades",
    descricao: "Quem fez o quê e quando.",
    icone: History,
  },
];

export default async function AdminPage() {
  await requireEdg();
  return (
    <>
      <CabecalhoPagina titulo="Administração" descricao="Área exclusiva do EDG." />
      <ul className="grid gap-3 md:grid-cols-2">
        {SECOES.map(({ href, titulo, descricao, icone: Icone }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-20 items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-destaque/20 text-primary">
                <Icone className="size-6" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{titulo}</span>
                <span className="block text-sm text-muted-foreground">{descricao}</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
