/**
 * Agenda das notificações programadas (horário de Belém).
 * Funções puras: sem banco, fáceis de testar.
 */
import { deBelem, formatarDataHora, hojeEmBelem, somarDias } from "@/lib/datas";

export type Recorrencia = "uma_vez" | "diaria" | "semanal";
export type Agenda = { recorrencia: Recorrencia; data?: string | null; hora: string; diasSemana?: number[] };

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const DIAS_EXTENSO = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const hhmm = (hora: string) => hora.slice(0, 5);
/** Dia da semana (0 = domingo) de uma data "yyyy-MM-dd". */
const diaDaSemana = (data: string) => new Date(`${data}T12:00:00Z`).getUTCDay();

/** Próximo envio estritamente depois de `depoisDe`. null = não envia mais. */
export function proximoEnvio(a: Agenda, depoisDe: Date = new Date()): Date | null {
  const hora = hhmm(a.hora);
  if (a.recorrencia === "uma_vez") {
    if (!a.data) return null;
    const quando = deBelem(a.data, hora);
    return quando > depoisDe ? quando : null;
  }
  const dias = a.recorrencia === "semanal" ? new Set(a.diasSemana ?? []) : null;
  if (dias && dias.size === 0) return null;
  const hoje = hojeEmBelem();
  for (let i = -1; i <= 8; i++) {
    const d = somarDias(hoje, i);
    if (dias && !dias.has(diaDaSemana(d))) continue;
    const quando = deBelem(d, hora);
    if (quando > depoisDe) return quando;
  }
  return null;
}

/** "Todos os dias às 06:00", "Seg, Qua e Sex às 19:30", "Uma vez em 25/11 às 08:00". */
export function descreverAgenda(a: Agenda): string {
  const hora = hhmm(a.hora);
  if (a.recorrencia === "uma_vez") return `Uma vez, em ${a.data?.split("-").reverse().slice(0, 2).join("/")} às ${hora}`;
  if (a.recorrencia === "diaria") return `Todos os dias às ${hora}`;
  const dias = [...(a.diasSemana ?? [])].sort();
  if (dias.length === 7) return `Todos os dias às ${hora}`;
  if (dias.join() === "1,2,3,4,5") return `De segunda a sexta às ${hora}`;
  if (dias.join() === "0,6") return `Sábado e domingo às ${hora}`;
  if (dias.length === 1) return `Toda ${DIAS_EXTENSO[dias[0]]}${dias[0] === 0 || dias[0] === 6 ? "" : "-feira"} às ${hora}`.replace("Toda domingo", "Todo domingo").replace("Toda sábado", "Todo sábado");
  const nomes = dias.map((d) => DIAS_SEMANA[d]);
  return `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)} às ${hora}`;
}

/** "hoje às 18:00", "amanhã às 06:00", "sex, 28/11 às 06:00". */
export function rotuloEnvio(quando: Date | string | null): string {
  if (!quando) return "—";
  const dia = formatarDataHora(quando, "yyyy-MM-dd");
  const hora = formatarDataHora(quando, "HH:mm");
  const hoje = hojeEmBelem();
  if (dia === hoje) return `hoje às ${hora}`;
  if (dia === somarDias(hoje, 1)) return `amanhã às ${hora}`;
  if (dia === somarDias(hoje, -1)) return `ontem às ${hora}`;
  return `${formatarDataHora(quando, "EEE, dd/MM")} às ${hora}`;
}

export type Variaveis = { nome: string; leitura: string; sequencia: number };

/** Troca {nome}, {leitura} e {sequencia} pelos dados de cada pessoa. */
export function personalizar(texto: string, v: Variaveis): string {
  return texto
    .replace(/\{nome\}/gi, v.nome.trim().split(/\s+/)[0] || "")
    .replace(/\{leitura\}/gi, v.leitura || "a leitura de hoje")
    .replace(/\{sequencia\}/gi, String(v.sequencia))
    .replace(/\s{2,}/g, " ")
    .trim();
}
