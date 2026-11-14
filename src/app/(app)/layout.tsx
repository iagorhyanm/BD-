import Image from "next/image";
import Link from "next/link";
import { requireStaff, ROTULO_PAPEL } from "@/lib/auth";
import { listarEdicoes, obterEdicaoAtual } from "@/lib/edicao";
import { MenuLateral } from "@/components/layout/menu-lateral";
import { BarraInferior } from "@/components/layout/barra-inferior";
import { SeletorEdicao } from "@/components/layout/seletor-edicao";
import { MenuUsuario } from "@/components/layout/menu-usuario";
import { tema } from "@/theme.config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requireStaff();
  const [edicoes, atual] = await Promise.all([listarEdicoes(), obterEdicaoAtual()]);
  const ehEdg = perfil.papel === "edg";

  return (
    <div className="flex min-h-dvh">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <MenuLateral ehEdg={ehEdg} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 lg:px-8">
            <Link href="/" className="lg:hidden" aria-label="Início">
              <Image src={tema.logo} alt="" width={36} height={36} className="size-9" />
            </Link>
            <div className="min-w-0 flex-1">
              <SeletorEdicao
                edicoes={edicoes.map((e) => ({ id: e.id, nome: e.nome, ativa: e.ativa }))}
                atualId={atual?.id ?? null}
              />
            </div>
            <MenuUsuario nome={perfil.nome} papel={ROTULO_PAPEL[perfil.papel]} />
          </div>
        </header>
        <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
      <BarraInferior ehEdg={ehEdg} />
    </div>
  );
}
