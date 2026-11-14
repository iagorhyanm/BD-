"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { escolherEdicao } from "@/server/actions/edicao-atual";

type Opcao = { id: string; nome: string; ativa: boolean };

export function SeletorEdicao({ edicoes, atualId }: { edicoes: Opcao[]; atualId: string | null }) {
  const [pendente, iniciar] = useTransition();
  if (edicoes.length === 0) return null;

  return (
    <Select
      value={atualId ?? undefined}
      onValueChange={(id) => iniciar(() => escolherEdicao(id))}
      disabled={pendente}
    >
      <SelectTrigger aria-label="Edição" className="max-w-[11rem] min-w-0 font-semibold sm:max-w-xs">
        <SelectValue placeholder="Edição" />
      </SelectTrigger>
      <SelectContent>
        {edicoes.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            {e.nome}
            {e.ativa ? " · ativa" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
