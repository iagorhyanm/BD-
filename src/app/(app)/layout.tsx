import Image from "next/image";
import Link from "next/link";
import { requireUsuario, ROTULO_PAPEL } from "@/lib/auth";
import { MenuLateral } from "@/components/layout/menu-lateral";
import { BarraInferior } from "@/components/layout/barra-inferior";
import { MenuUsuario } from "@/components/layout/menu-usuario";
import { tema } from "@/theme.config";
import { obterConfig } from "@/lib/config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requireUsuario();
  const ehAdmin = perfil.papel === "admin";
  const config = await obterConfig();

  return (
    <div className="flex min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <MenuLateral ehAdmin={ehAdmin} nome={config.nome} slogan={config.slogan} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
            <Link href="/" className="flex items-center gap-2" aria-label="Início">
              <Image src={tema.logo} alt="" width={32} height={32} className="size-8 rounded-lg" />
              <span className="text-lg font-bold tracking-tight">{config.nome}</span>
            </Link>
            <div className="flex-1" />
            <MenuUsuario nome={perfil.nome} papel={ROTULO_PAPEL[perfil.papel]} />
          </div>
        </header>
        <div className="hidden justify-end px-8 pt-4 lg:flex">
          <MenuUsuario nome={perfil.nome} papel={ROTULO_PAPEL[perfil.papel]} />
        </div>
        <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
      <BarraInferior ehAdmin={ehAdmin} />
    </div>
  );
}
