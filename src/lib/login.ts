/** Regras de login: aceita e-mail ou nome de usuário. */

export const REGEX_USUARIO = /^[a-z0-9._-]{3,30}$/;

export function dominioLogin(): string {
  return (process.env.LOGIN_DOMINIO || "bandinha.local").toLowerCase();
}

/** Normaliza o que a pessoa digitou no campo de login. */
export function normalizarIdentificador(valor: string): string {
  return valor.trim().toLowerCase();
}

export function ehEmail(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

/**
 * Converte "joao" em "joao@bandinha.local". E-mails passam direto.
 * O Supabase Auth exige e-mail, então usuários sem e-mail recebem um técnico.
 */
export function identificadorParaEmail(valor: string, dominio = dominioLogin()): string {
  const v = normalizarIdentificador(valor);
  return v.includes("@") ? v : `${v}@${dominio}`;
}

/** Diz se o e-mail é apenas técnico (gerado a partir de um usuário). */
export function ehEmailTecnico(email: string | null | undefined, dominio = dominioLogin()): boolean {
  return !!email && email.toLowerCase().endsWith(`@${dominio}`);
}
