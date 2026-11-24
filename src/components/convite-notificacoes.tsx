"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ativarPush, estadoPush } from "@/lib/push-cliente";
import { salvarInscricao } from "@/server/actions/notificacoes";

const CHAVE = "biblerats:convite-notif-adiado";

/** Cartão no Início convidando a ligar as notificações (some depois de ativar ou dispensar). */
export function ConviteNotificacoes() {
  const [mostrar, setMostrar] = useState(false);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    let adiado = 0;
    try {
      adiado = Number(localStorage.getItem(CHAVE) ?? 0);
    } catch {}
    if (Date.now() - adiado < 7 * 86400000) return;
    estadoPush().then((e) => setMostrar(e === "inativo" && Notification.permission === "default"));
  }, []);

  if (!mostrar) return null;
  return (
    <section className="relative flex gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <BellRing className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="flex-1 space-y-2 pr-6">
        <p className="text-sm font-semibold">Quer um lembrete se esquecer de ler?</p>
        <p className="text-sm text-muted-foreground">Ative as notificações: avisamos no fim do dia se você esquecer, e quando seus amigos lerem ou comentarem.</p>
        <Button
          size="sm"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await ativarPush();
              if ("erro" in r) {
                toast.error(r.erro);
                setMostrar(false);
                return;
              }
              const s = await salvarInscricao(r.inscricao, r.aparelho);
              if (!s.ok) return void toast.error(s.erro);
              toast.success("Notificações ativadas! 🔔");
              setMostrar(false);
            })
          }
        >
          {pendente ? "Ativando…" : "Ativar notificações"}
        </Button>
      </div>
      <button
        type="button"
        aria-label="Dispensar"
        className="absolute top-2 right-2 flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        onClick={() => {
          try {
            localStorage.setItem(CHAVE, String(Date.now()));
          } catch {}
          setMostrar(false);
        }}
      >
        <X className="size-4" />
      </button>
    </section>
  );
}
