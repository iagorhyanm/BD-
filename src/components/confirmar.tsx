"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Diálogo de confirmação reutilizável (ex.: antes de excluir).
 * `aoConfirmar` pode ser assíncrono; o diálogo só fecha ao terminar.
 */
export function Confirmar({
  gatilho,
  titulo,
  descricao,
  rotuloConfirmar = "Confirmar",
  destrutivo = false,
  aoConfirmar,
}: {
  gatilho: React.ReactNode;
  titulo: string;
  descricao?: React.ReactNode;
  rotuloConfirmar?: string;
  destrutivo?: boolean;
  aoConfirmar: () => Promise<unknown> | unknown;
}) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();

  return (
    <AlertDialog open={aberto} onOpenChange={(v) => !pendente && setAberto(v)}>
      <AlertDialogTrigger asChild>{gatilho}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          {descricao && <AlertDialogDescription>{descricao}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendente}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant={destrutivo ? "destructive" : "default"}
            disabled={pendente}
            onClick={(e) => {
              e.preventDefault();
              iniciar(async () => {
                await aoConfirmar();
                setAberto(false);
              });
            }}
          >
            {pendente ? "Aguarde…" : rotuloConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
