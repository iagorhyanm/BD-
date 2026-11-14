/** Utilidades de telefone brasileiro. */

/** Mantém só os dígitos e remove o 55 do país, se houver. */
export function normalizarTelefone(valor: string | null | undefined): string {
  let d = (valor ?? "").replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d;
}

/** Telefone válido: DDD + 8 ou 9 dígitos. */
export function telefoneValido(valor: string | null | undefined): boolean {
  const d = normalizarTelefone(valor);
  return d.length === 10 || d.length === 11;
}

/** Máscara progressiva para digitação: (94) 99123-4567 */
export function mascararTelefone(valor: string | null | undefined): string {
  const d = normalizarTelefone(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Link do WhatsApp com mensagem opcional. */
export function linkWhatsApp(telefone: string | null | undefined, mensagem?: string): string | null {
  const d = normalizarTelefone(telefone);
  if (!telefoneValido(d)) return null;
  const base = `https://wa.me/55${d}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

export function linkLigar(telefone: string | null | undefined): string | null {
  const d = normalizarTelefone(telefone);
  return telefoneValido(d) ? `tel:+55${d}` : null;
}
