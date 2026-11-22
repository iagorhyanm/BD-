"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, EllipsisVertical, PlusSquare, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Plataforma = "ios" | "android" | "outro";

declare global {
  interface Window {
    __promptInstalar?: PromptEvent | null;
  }
}

const CHAVE = "biblerats:instalar-adiado";
const ESPERA_DIAS = 5;
/** Evento para abrir o pop-up de qualquer lugar (ex.: botão no Perfil). */
export const ABRIR_INSTALAR = "biblerats:abrir-instalar";

/** Script que roda antes do React, para não perder o evento de instalação do Android. */
export const SCRIPT_CAPTURA_INSTALAR = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__promptInstalar=e;window.dispatchEvent(new Event("biblerats:pode-instalar"));});window.addEventListener("appinstalled",function(){window.__promptInstalar=null;try{localStorage.setItem("biblerats:instalado","1")}catch(_){}});`;

function detectarPlataforma(): Plataforma {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return "ios";
  if (/android/i.test(ua)) return "android";
  return "outro";
}

function jaInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function ler(chave: string) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}
function gravar(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

export function InstalarApp({ nomeApp }: { nomeApp: string }) {
  const [aberto, setAberto] = useState(false);
  const [plataforma, setPlataforma] = useState<Plataforma>("outro");
  const [podeInstalar, setPodeInstalar] = useState(false);

  useEffect(() => {
    if (jaInstalado()) return;
    const p = detectarPlataforma();
    setPlataforma(p);
    setPodeInstalar(!!window.__promptInstalar);

    const aoPoder = () => setPodeInstalar(true);
    const aoAbrir = () => setAberto(true);
    const aoInstalar = () => {
      setAberto(false);
      setPodeInstalar(false);
    };
    window.addEventListener("biblerats:pode-instalar", aoPoder);
    window.addEventListener(ABRIR_INSTALAR, aoAbrir);
    window.addEventListener("appinstalled", aoInstalar);

    // Mostra sozinho no celular, se a pessoa não adiou há pouco.
    const adiado = Number(ler(CHAVE) ?? 0);
    const recente = Date.now() - adiado < ESPERA_DIAS * 86400000;
    let t: ReturnType<typeof setTimeout> | undefined;
    if (!recente && (p !== "outro" || window.__promptInstalar)) {
      t = setTimeout(() => setAberto(true), 2500);
    }
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("biblerats:pode-instalar", aoPoder);
      window.removeEventListener(ABRIR_INSTALAR, aoAbrir);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  function adiar() {
    gravar(CHAVE, String(Date.now()));
    setAberto(false);
  }

  async function instalar() {
    const e = window.__promptInstalar;
    if (!e) return;
    await e.prompt();
    const { outcome } = await e.userChoice;
    window.__promptInstalar = null;
    setPodeInstalar(false);
    if (outcome === "accepted") setAberto(false);
    else adiar();
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={adiar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="instalar-titulo"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl"
      >
        <button type="button" onClick={adiar} aria-label="Fechar" className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
          <X className="size-5" />
        </button>
        <div className="flex items-center gap-3 pr-8">
          <Image src="/icons/icon-192.png" alt="" width={56} height={56} className="size-14 rounded-2xl" />
          <div>
            <p id="instalar-titulo" className="text-lg leading-tight font-bold">
              {plataforma === "ios" ? `Coloque o ${nomeApp} na tela de início` : `Baixe o app ${nomeApp}`}
            </p>
            <p className="text-sm text-muted-foreground">Abre com um toque, em tela cheia, como um app.</p>
          </div>
        </div>

        {podeInstalar ? (
          <div className="mt-5 space-y-2">
            <Button size="lg" className="h-13 w-full text-base" onClick={instalar}>
              <Download /> Instalar app
            </Button>
            <Button variant="ghost" className="w-full" onClick={adiar}>
              Agora não
            </Button>
          </div>
        ) : plataforma === "ios" ? (
          <>
            <ol className="mt-5 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">1</span>
                <span>
                  Toque em <b>Compartilhar</b> <Share className="inline size-4 align-text-bottom text-sky-600" aria-label="(ícone de compartilhar)" /> na barra do navegador
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">2</span>
                <span>
                  Role e escolha <b>Adicionar à Tela de Início</b> <PlusSquare className="inline size-4 align-text-bottom" aria-hidden />
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">3</span>
                <span>
                  Toque em <b>Adicionar</b>. Pronto! 🐀📖
                </span>
              </li>
            </ol>
            <Button variant="outline" className="mt-5 w-full" onClick={adiar}>
              Entendi
            </Button>
          </>
        ) : (
          <>
            <ol className="mt-5 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">1</span>
                <span>
                  Toque no menu <EllipsisVertical className="inline size-4 align-text-bottom" aria-label="(três pontinhos)" /> do navegador
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">2</span>
                <span>
                  Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>
                </span>
              </li>
            </ol>
            <Button variant="outline" className="mt-5 w-full" onClick={adiar}>
              Entendi
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
