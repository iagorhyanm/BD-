import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EstadoVazio } from "@/components/estado-vazio";
import { Button } from "@/components/ui/button";

/** Mostrado quando ainda não existe nenhuma edição cadastrada. */
export function SemEdicao({ titulo }: { titulo: string }) {
  return (
    <>
      <CabecalhoPagina titulo={titulo} />
      <EstadoVazio
        icone={CalendarPlus}
        titulo="Nenhuma edição cadastrada"
        descricao="Os dados ficam organizados por edição do EJC. O EDG precisa criar a primeira edição."
        acao={
          <Button asChild variant="outline">
            <Link href="/admin/edicoes">Ir para Edições</Link>
          </Button>
        }
      />
    </>
  );
}
