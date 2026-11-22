/** "1", "1,5", "0,5" — pontos do placar (atraso vale meio ponto). */
export function formatarPontos(n: number | string): string {
  const v = Number(n);
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export function rotuloPontos(n: number | string): string {
  return Number(n) < 2 ? "ponto" : "pontos";
}
