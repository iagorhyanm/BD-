import { Hammer } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { EstadoVazio } from "@/components/estado-vazio";

/** Página provisória para módulos das próximas fases. */
export function EmBreve({ titulo, fase }: { titulo: string; fase: number }) {
  return (
    <>
      <CabecalhoPagina titulo={titulo} />
      <EstadoVazio
        icone={Hammer}
        titulo="Em construção"
        descricao={`Este módulo chega na Fase ${fase} do sistema.`}
      />
    </>
  );
}
