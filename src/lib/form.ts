import type { FormEvent } from "react";

/**
 * Envia um formulário sem o reset automático do React 19 (que apagaria
 * o que a pessoa digitou quando o servidor devolve um erro).
 *   <form onSubmit={semReset(enviar)}>
 */
export function semReset(fn: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fn(new FormData(e.currentTarget));
  };
}
