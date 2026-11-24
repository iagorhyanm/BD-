"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Bell, BellRing, Lock, PlusSquare, Share } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ativarPush, estadoPush, type EstadoPush } from "@/lib/push-cliente";
import { salvarInscricao } from "@/server/actions/notificacoes";

const ADIADO = "biblerats:notif-obrigatoria-adiada";
const SINCRONIZADO = "biblerats:notif-sincronizada";
/** Avisa o pop-up de instalação que este já foi resolvido (para não abrir dois ao mesmo tempo). */
export const NOTIF_RESOLVIDA = "biblerats:notif-resolvida";

function ler(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function gravar(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}
const hoje = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

/**
 * Pop-up obrigatório no Início: só fecha ativando as notificações.
 * Exceções (para ninguém ficar preso): quem bloqueou no navegador vê
 * como liberar; iPhone sem o app instalado vê como instalar. Nesses
 * dois casos dá para deixar para o dia seguinte.
 */
export function ExigirNotificacoes() {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    estadoPush().then(async (e) => {
      if (e === "ativo") {
        // Garante que o servidor conhece este aparelho (1x por dia).
        if (ler(SINCRONIZADO) !== hoje()) {
          const reg = await navigator.serviceWorker.getRegistration();
          const sub = await reg?.pushManager.getSubscription();
          if (sub) {
            const r = await salvarInscricao(sub.toJSON(), "");
            if (r.ok) gravar(SINCRONIZADO, hoje());
          }
        }
        window.dispatchEvent(new Event(NOTIF_RESOLVIDA));
        return;
      }
      const podeAdiar = e === "bloqueado" || e === "instalar-primeiro";
      if (e === "sem-suporte" || (podeAdiar && ler(ADIADO) === hoje())) {
        window.dispatchEvent(new Event(NOTIF_RESOLVIDA));
        return;
      }
      document.documentElement.dataset.notifPendente = "1";
      setEstado(e);
    });
  }, []);

  function fechar() {
    delete document.documentElement.dataset.notifPendente;
    setEstado(null);
    window.dispatchEvent(new Event(NOTIF_RESOLVIDA));
  }

  function ativar() {
    iniciar(async () => {
      const r = await ativarPush();
      if ("erro" in r) {
        setEstado(await estadoPush());
        if (Notification.permission === "default") toast.error("Toque em “Permitir” para continuar.");
        return;
      }
      const s = await salvarInscricao(r.inscricao, r.aparelho);
      if (!s.ok) return void toast.error(s.erro);
      gravar(SINCRONIZADO, hoje());
      toast.success("Notificações ativadas! 🔔");
      fechar();
    });
  }

  if (!estado || estado === "ativo" || estado === "sem-suporte") return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-3 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="notif-titulo" className="w-full max-w-sm rounded-3xl bg-card p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-xl">
        <div className="relative mx-auto mb-4 w-fit">
          <Image src="/icons/icon-192.png" alt="" width={72} height={72} className="size-18 rounded-2xl" />
          <span className="absolute -top-2 -right-2 flex size-9 items-center justify-center rounded-full bg-destaque text-destaque-foreground shadow">
            <BellRing className="size-5" aria-hidden />
          </span>
        </div>

        {estado === "inativo" && (
          <>
            <h2 id="notif-titulo" className="text-xl font-bold">Ative as notificações 🔔</h2>
            <p className="mt-2 text-muted-foreground">Para participar, é preciso receber os avisos do BibleRats:</p>
            <ul className="mt-4 space-y-2 text-left text-sm">
              <li>⏰ Lembrete se você esquecer a leitura do dia</li>
              <li>🔥 Quando seus amigos fizerem a leitura</li>
              <li>💬 Quando comentarem na sua leitura</li>
              <li>📣 Recados da equipe</li>
            </ul>
            <Button size="lg" className="mt-6 h-14 w-full text-base" onClick={ativar} disabled={pendente}>
              <Bell /> {pendente ? "Ativando…" : "Ativar notificações"}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Quando o celular perguntar, toque em “Permitir”. Dá para escolher o que receber depois, no Perfil.</p>
          </>
        )}

        {estado === "bloqueado" && (
          <>
            <h2 id="notif-titulo" className="text-xl font-bold">As notificações estão bloqueadas</h2>
            <p className="mt-2 text-sm text-muted-foreground">Você recusou antes, então o celular não deixa o app perguntar de novo. Para liberar:</p>
            <ol className="mt-4 space-y-2 text-left text-sm">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>
                  Toque no <Lock className="inline size-4 align-text-bottom" aria-label="cadeado" /> ao lado do endereço (ou em ⋮ → <b>Configurações do site</b>)
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>
                  Em <b>Notificações</b>, escolha <b>Permitir</b>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>Volte aqui e toque no botão abaixo</span>
              </li>
            </ol>
            <Button size="lg" className="mt-6 h-14 w-full text-base" onClick={ativar} disabled={pendente}>
              <Bell /> {pendente ? "Conferindo…" : "Já liberei, ativar"}
            </Button>
            <Button
              variant="ghost"
              className="mt-2 w-full text-muted-foreground"
              onClick={() => {
                gravar(ADIADO, hoje());
                fechar();
              }}
            >
              Lembrar amanhã
            </Button>
          </>
        )}

        {estado === "instalar-primeiro" && (
          <>
            <h2 id="notif-titulo" className="text-xl font-bold">Instale o app para receber os avisos</h2>
            <p className="mt-2 text-sm text-muted-foreground">No iPhone, as notificações só funcionam com o BibleRats na tela de início:</p>
            <ol className="mt-4 space-y-2 text-left text-sm">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>
                  Toque em <b>Compartilhar</b> <Share className="inline size-4 align-text-bottom text-sky-600" aria-label="(ícone de compartilhar)" />
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>
                  Escolha <b>Adicionar à Tela de Início</b> <PlusSquare className="inline size-4 align-text-bottom" aria-hidden />
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>
                  Abra o BibleRats <b>pelo ícone novo</b> e ative as notificações
                </span>
              </li>
            </ol>
            <Button
              variant="outline"
              className="mt-6 w-full"
              onClick={() => {
                gravar(ADIADO, hoje());
                // Já mostrou como instalar: não repete o outro pop-up hoje.
                gravar("biblerats:instalar-adiado", String(Date.now()));
                fechar();
              }}
            >
              Lembrar amanhã
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
