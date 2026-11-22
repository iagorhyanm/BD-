import { cn } from "@/lib/utils";

const CORES = ["bg-emerald-700", "bg-sky-700", "bg-amber-700", "bg-rose-700", "bg-violet-700", "bg-teal-700", "bg-orange-700", "bg-indigo-700"];

function corDe(texto: string) {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CORES[h % CORES.length];
}

export function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

/** Bolinha com as iniciais (cor estável por pessoa). */
export function AvatarNome({ nome, id, tamanho = "md" }: { nome: string; id?: string; tamanho?: "sm" | "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        corDe(id ?? nome),
        tamanho === "sm" && "size-8 text-xs",
        tamanho === "md" && "size-10 text-sm",
        tamanho === "lg" && "size-16 text-xl",
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
