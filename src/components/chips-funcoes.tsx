"use client";

import { ROTULO_TIPO_FUNCAO, type Funcao, type TipoFuncao } from "@/lib/dominio";

/** Seleção múltipla de funções em formato de chips (checkbox nativo, envia name="funcoes"). */
export function ChipsFuncoes({ funcoes, marcadas }: { funcoes: Funcao[]; marcadas: string[] }) {
  const grupos = (Object.keys(ROTULO_TIPO_FUNCAO) as TipoFuncao[])
    .map((t) => ({ tipo: t, itens: funcoes.filter((f) => f.tipo === t && (f.ativo || marcadas.includes(f.id))) }))
    .filter((g) => g.itens.length);

  return (
    <div className="space-y-3">
      {grupos.map((g) => (
        <fieldset key={g.tipo}>
          <legend className="mb-1.5 text-sm text-muted-foreground">{ROTULO_TIPO_FUNCAO[g.tipo]}</legend>
          <div className="flex flex-wrap gap-2">
            {g.itens.map((f) => (
              <label
                key={f.id}
                className="flex min-h-10 cursor-pointer items-center rounded-full border bg-background px-3.5 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
              >
                <input type="checkbox" name="funcoes" value={f.id} defaultChecked={marcadas.includes(f.id)} className="sr-only" />
                {f.nome}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
