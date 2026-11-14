import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

/** Fuso oficial do sistema (Marabá/PA). */
export const FUSO = "America/Belem";

/** Formata uma data/hora no fuso de Belém. Padrão: 14/11/2026 19:30 */
export function formatarDataHora(data: Date | string, padrao = "dd/MM/yyyy HH:mm"): string {
  return formatInTimeZone(new Date(data), FUSO, padrao, { locale: ptBR });
}

export function formatarData(data: Date | string, padrao = "dd/MM/yyyy"): string {
  return formatInTimeZone(new Date(data), FUSO, padrao, { locale: ptBR });
}

/** Converte "2026-11-14" + "19:30" (horário de Belém) para Date (UTC). */
export function deBelem(dataISO: string, hora = "00:00"): Date {
  return fromZonedTime(`${dataISO}T${hora}:00`, FUSO);
}

/** Data de hoje (yyyy-MM-dd) no fuso de Belém. */
export function hojeEmBelem(): string {
  return formatInTimeZone(new Date(), FUSO, "yyyy-MM-dd");
}

/**
 * Idade completa em anos, a partir de uma data de nascimento "yyyy-MM-dd".
 * `referencia` também é "yyyy-MM-dd" (padrão: hoje em Belém).
 */
export function calcularIdade(nascimentoISO: string, referencia = hojeEmBelem()): number {
  const [an, mn, dn] = nascimentoISO.split("-").map(Number);
  const [ar, mr, dr] = referencia.split("-").map(Number);
  let idade = ar - an;
  if (mr < mn || (mr === mn && dr < dn)) idade--;
  return idade;
}

/** Primeira letra maiúscula (ex.: "sábado, 14 de novembro" → "Sábado, 14 de novembro"). */
export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
