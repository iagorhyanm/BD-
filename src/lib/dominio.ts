/** Rótulos e tipos compartilhados dos módulos de equipe, agenda, repertório e equipamentos. */
import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type TipoFuncao = Enums["tipo_funcao"];
export type TipoEvento = Enums["tipo_evento"];
export type StatusPresenca = Enums["status_presenca"];
export type Nivel = Enums["nivel_membro"];
export type EstadoEquipamento = Enums["estado_equipamento"];
export type DonoEquipamento = Enums["dono_equipamento"];

export type Funcao = { id: string; nome: string; tipo: TipoFuncao; ordem: number; ativo: boolean };

export const ROTULO_TIPO_FUNCAO: Record<TipoFuncao, string> = {
  voz: "Voz",
  instrumento: "Instrumento",
  outro: "Outro",
};

export const ROTULO_NIVEL: Record<Nivel, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export const ROTULO_TIPO_EVENTO: Record<TipoEvento, string> = {
  ensaio: "Ensaio",
  apresentacao: "Apresentação",
};

export const CLASSE_TIPO_EVENTO: Record<TipoEvento, string> = {
  ensaio: "bg-sky-100 text-sky-900",
  apresentacao: "bg-destaque/30 text-foreground",
};

export const STATUS_PRESENCA: { valor: StatusPresenca; rotulo: string; curto: string; classe: string }[] = [
  { valor: "presente", rotulo: "Presente", curto: "P", classe: "bg-emerald-600 text-white border-emerald-600" },
  { valor: "atraso", rotulo: "Atraso", curto: "A", classe: "bg-amber-500 text-white border-amber-500" },
  { valor: "justificada", rotulo: "Falta justificada", curto: "J", classe: "bg-sky-600 text-white border-sky-600" },
  { valor: "falta", rotulo: "Falta", curto: "F", classe: "bg-rose-600 text-white border-rose-600" },
];

export const rotuloPresenca = (s: StatusPresenca) => STATUS_PRESENCA.find((x) => x.valor === s)?.rotulo ?? s;

export const MOMENTOS = [
  { valor: "abertura", rotulo: "Abertura" },
  { valor: "animacao", rotulo: "Animação" },
  { valor: "palestra", rotulo: "Palestra" },
  { valor: "oracao", rotulo: "Oração" },
  { valor: "adoracao", rotulo: "Adoração" },
  { valor: "louvor", rotulo: "Louvor" },
  { valor: "missa", rotulo: "Missa" },
  { valor: "encerramento", rotulo: "Encerramento" },
  { valor: "outro", rotulo: "Outro" },
] as const;

export const rotuloMomento = (v: string) => MOMENTOS.find((m) => m.valor === v)?.rotulo ?? v;

export const ROTULO_ESTADO: Record<EstadoEquipamento, { rotulo: string; classe: string }> = {
  bom: { rotulo: "Bom", classe: "bg-emerald-100 text-emerald-900" },
  defeito: { rotulo: "Com defeito", classe: "bg-rose-100 text-rose-900" },
  manutencao: { rotulo: "Em manutenção", classe: "bg-amber-100 text-amber-900" },
};

/** Duração padrão assumida quando o evento não tem horário de término (para conflitos). */
export const DURACAO_PADRAO_MS = 2 * 60 * 60 * 1000;

export function fimEfetivo(inicio: string, fim: string | null): Date {
  return fim ? new Date(fim) : new Date(new Date(inicio).getTime() + DURACAO_PADRAO_MS);
}

export function seSobrepoem(a: { inicio: string; fim: string | null }, b: { inicio: string; fim: string | null }) {
  return new Date(a.inicio) < fimEfetivo(b.inicio, b.fim) && new Date(b.inicio) < fimEfetivo(a.inicio, a.fim);
}

/** Situação de faltas em relação ao limite da edição. */
export function situacaoFaltas(faltas: number, limite: number): "ok" | "no_limite" | "passou" {
  if (faltas > limite) return "passou";
  if (limite > 0 && faltas === limite) return "no_limite";
  return "ok";
}

/** Converte link do YouTube/Spotify em rótulo amigável. */
export function rotuloMidia(url: string | null | undefined): string {
  if (!url) return "";
  if (/youtu\.?be/.test(url)) return "YouTube";
  if (/spotify/.test(url)) return "Spotify";
  return "Ouvir";
}

/** Garante que um link digitado tenha protocolo. */
export function normalizarUrl(v: string | null | undefined): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}
