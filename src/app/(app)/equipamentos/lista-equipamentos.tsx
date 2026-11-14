"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Guitar, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EstadoVazio } from "@/components/estado-vazio";
import { ROTULO_ESTADO, type DonoEquipamento, type EstadoEquipamento } from "@/lib/dominio";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  item: string;
  categoria: string | null;
  quantidade: number;
  dono_tipo: DonoEquipamento;
  dono_nome: string | null;
  estado: EstadoEquipamento;
  responsavel: string | null;
  foto: string | null;
  comQuem: string | null;
};

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function ListaEquipamentos({ itens }: { itens: Item[] }) {
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState<"" | EstadoEquipamento | "fora">("");
  const [categoria, setCategoria] = useState("");
  const categorias = useMemo(() => [...new Set(itens.map((i) => i.categoria).filter(Boolean) as string[])].sort(), [itens]);

  const filtrados = itens.filter((i) => {
    if (estado === "fora" ? !i.comQuem : estado && i.estado !== estado) return false;
    if (categoria && i.categoria !== categoria) return false;
    const b = normalizar(busca.trim());
    return !b || normalizar(`${i.item} ${i.categoria ?? ""} ${i.dono_nome ?? ""} ${i.responsavel ?? ""}`).includes(b);
  });

  if (itens.length === 0) {
    return <EstadoVazio icone={Guitar} titulo="Inventário vazio" descricao="Cadastre instrumentos, cabos, caixas de som e o que mais a equipe usa." />;
  }

  const chip = (ativo: boolean) => cn("min-h-9 shrink-0 rounded-full border px-3 text-sm", ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card");

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item, dono ou responsável" aria-label="Buscar" className="pl-9" />
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por estado">
        <button aria-pressed={!estado} onClick={() => setEstado("")} className={chip(!estado)}>Todos</button>
        {(Object.keys(ROTULO_ESTADO) as EstadoEquipamento[]).map((e) => (
          <button key={e} aria-pressed={estado === e} onClick={() => setEstado(estado === e ? "" : e)} className={chip(estado === e)}>
            {ROTULO_ESTADO[e].rotulo}
          </button>
        ))}
        <button aria-pressed={estado === "fora"} onClick={() => setEstado(estado === "fora" ? "" : "fora")} className={chip(estado === "fora")}>
          Emprestados agora
        </button>
      </div>
      {categorias.length > 1 && (
        <select aria-label="Categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="h-11 w-full rounded-lg border border-input bg-background px-3 sm:w-64 md:h-10">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      <ul className="grid gap-2 sm:grid-cols-2">
        {filtrados.map((i) => (
          <li key={i.id}>
            <Link href={`/equipamentos/${i.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/40">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {i.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.foto} alt="" className="size-full object-cover" loading="lazy" />
                ) : (
                  <Guitar className="size-6 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {i.quantidade > 1 && <span className="text-muted-foreground">{i.quantidade}× </span>}
                  {i.item}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {[i.categoria, i.dono_tipo === "emprestado" ? `de ${i.dono_nome}` : "da equipe"].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", ROTULO_ESTADO[i.estado].classe)}>{ROTULO_ESTADO[i.estado].rotulo}</span>
                  {i.comQuem && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">com {i.comQuem}</span>}
                </div>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {filtrados.length === 0 && <p className="rounded-xl border border-dashed bg-card p-8 text-center text-muted-foreground">Nada encontrado.</p>}
    </div>
  );
}
