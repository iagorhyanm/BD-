import { randomInt } from "node:crypto";

/** Sem caracteres ambíguos (0/O, 1/l/I) para facilitar ditar por WhatsApp. */
const LETRAS = "abcdefghjkmnpqrstuvwxyz";
const MAIUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMEROS = "23456789";

/** Gera senha provisória legível, ex.: "Kq7m-Xr4p". */
export function gerarSenhaProvisoria(): string {
  const todos = LETRAS + MAIUSCULAS + NUMEROS;
  const pega = (s: string) => s[randomInt(s.length)];
  const bloco = () => {
    const chars = [pega(MAIUSCULAS), pega(LETRAS), pega(NUMEROS), pega(todos)];
    return chars.join("");
  };
  return `${bloco()}-${bloco()}`;
}

export const SENHA_MINIMA = 8;

/** Valida a senha nova escolhida pela pessoa. Retorna a mensagem de erro ou null. */
export function validarSenhaNova(senha: string): string | null {
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (!/[A-Za-z]/.test(senha) || !/[0-9]/.test(senha)) return "Use letras e números na senha.";
  return null;
}
