import Link from "next/link";
import { CalendarPlus, ChevronRight } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { obterEdicaoAtual } from "@/lib/edicao";
import { NAVEGACAO } from "@/config/navegacao";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EstadoVazio } from "@/components/estado-vazio";
import { Badge } from "@/components/ui/badge";

export default async function PainelPage() {
  const perfil = await requireStaff();
  const edicao = await obterEdicaoAtual();
  const primeiroNome = perfil.nome.split(" ")[0];
  const ehEdg = perfil.papel === "edg";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">Paz e bem,</p>
        <h1 className="text-2xl font-bold tracking-tight">{primeiroNome} 🎶</h1>
      </div>

      {!edicao ? (
        <EstadoVazio
          icone={CalendarPlus}
          titulo="Nenhuma edição cadastrada"
          descricao={
            ehEdg
              ? "Comece criando a edição do EJC (ex.: “EJC 2027”). Todos os dados ficam organizados por edição."
              : "Peça ao EDG para criar a edição do EJC. Todos os dados ficam organizados por edição."
          }
          acao={
            ehEdg && (
              <Button asChild size="lg">
                <Link href="/admin/edicoes">Criar edição</Link>
              </Button>
            )
          }
        />
      ) : (
        <Card className="border-0 bg-primary text-primary-foreground">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-primary-foreground/75">Edição em visualização</p>
              <p className="text-xl font-bold">{edicao.nome}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {edicao.ativa && <Badge className="bg-destaque text-destaque-foreground">Ativa</Badge>}
              <Badge variant="outline" className="border-primary-foreground/30 text-primary-foreground">
                Vagas: {edicao.vagas_masculino} H · {edicao.vagas_feminino} M
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="atalhos">
        <h2 id="atalhos" className="mb-3 text-lg font-semibold">
          Atalhos
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {NAVEGACAO.filter((i) => i.href !== "/" && (!i.somenteEdg || ehEdg)).map((item) => {
            const Icone = item.icone;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-14 items-center gap-3 rounded-xl border bg-card px-4 transition-colors hover:border-primary/40"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-destaque/20 text-primary">
                    <Icone className="size-5" aria-hidden />
                  </span>
                  <span className="flex-1 font-medium">{item.rotulo}</span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
