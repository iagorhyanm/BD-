import type { LucideIcon } from "lucide-react";

export function EstadoVazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-destaque/20 text-primary">
        <Icone className="size-7" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {descricao && <p className="mt-1 max-w-sm text-muted-foreground">{descricao}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}
