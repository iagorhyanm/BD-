"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { mascararTelefone } from "@/lib/telefone";

/** Campo de telefone com máscara (94) 99123-4567. */
export function InputTelefone({
  defaultValue,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange" | "defaultValue"> & {
  defaultValue?: string | null;
}) {
  const [valor, setValor] = useState(mascararTelefone(defaultValue));
  return (
    <Input
      {...props}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder="(94) 99999-9999"
      value={valor}
      onChange={(e) => setValor(mascararTelefone(e.target.value))}
    />
  );
}
