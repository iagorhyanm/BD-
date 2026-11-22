import { cn } from "@/lib/utils";
import { urlFoto } from "@/lib/avatar";

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

const TAMANHOS = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-xl", xl: "size-24 text-3xl" };

/** Foto de perfil, ou bolinha com as iniciais (cor estável por pessoa). */
export function AvatarNome({
  nome,
  id,
  foto,
  tamanho = "md",
}: {
  nome: string;
  id?: string;
  /** Caminho da foto no bucket "avatares". */
  foto?: string | null;
  tamanho?: keyof typeof TAMANHOS;
}) {
  const url = urlFoto(foto);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" aria-hidden loading="lazy" className={cn("shrink-0 rounded-full bg-muted object-cover", TAMANHOS[tamanho])} />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        corDe(id ?? nome),
        TAMANHOS[tamanho],
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
