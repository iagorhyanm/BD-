import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, HardDrive, History, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";

export const metadata: Metadata = { title: "Administração" };

const SECOES = [
  { href: "/admin/usuarios", titulo: "Usuários", descricao: "Redefinir senha, desativar contas e escolher administradores.", icone: Users },
  { href: "/admin/logs", titulo: "Log de atividades", descricao: "Quem fez o quê e quando.", icone: History },
  { href: "/admin/armazenamento", titulo: "Armazenamento", descricao: "Espaço usado pelas fotos das leituras.", icone: HardDrive },
];

export default async function AdminPage() {
  await requireAdmin();
  return (
    <>
      <CabecalhoPagina titulo="Administração" descricao="Área exclusiva de administradores do BibleRats." />
      <ul className="grid gap-3">
        {SECOES.map(({ href, titulo, descricao, icone: Icone }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-20 items-center gap-4 rounded-2xl border bg-card p-4 hover:border-primary/40">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
