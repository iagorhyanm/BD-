"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, MessageCircle, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { tema } from "@/theme.config";

export function BotaoCopiar({ texto, rotulo = "Copiar link", className }: { texto: string; rotulo?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setOk(true);
        toast.success("Copiado!");
        setTimeout(() => setOk(false), 2000);
      }}
    >
      {ok ? <Check /> : <Copy />} {rotulo}
    </Button>
  );
}

/** QR code do link, com opção de baixar em PNG (para imprimir ou mandar no grupo). */
export function QrCodeLink({ url, nomeArquivo = "qrcode-inscricao" }: { url: string; nomeArquivo?: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 720,
      margin: 2,
      color: { dark: tema.cores.primaria, light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setDataUrl);
  }, [url]);

  return (
    <div className="flex flex-col items-center gap-3">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`QR code do link ${url}`} className="size-56 rounded-xl border bg-white p-2" />
      ) : (
        <div className="size-56 animate-pulse rounded-xl bg-muted" />
      )}
      {dataUrl && (
        <Button asChild variant="outline">
          <a href={dataUrl} download={`${nomeArquivo}.png`}>
            <Download /> Baixar QR code
          </a>
        </Button>
      )}
    </div>
  );
}

export function PainelCompartilhar({ url, titulo }: { url: string; titulo: string }) {
  const msg = `🎶 ${titulo}\n\nFaça sua inscrição para a Bandinha do EJC: ${url}`;
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">Link público</p>
        <div className="rounded-lg border bg-muted px-3 py-3 font-mono text-sm break-all">{url}</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <BotaoCopiar texto={url} />
          <Button asChild variant="outline">
            <a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle /> Enviar no WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Abrir formulário
            </a>
          </Button>
        </div>
      </div>
      <QrCodeLink url={url} />
    </div>
  );
}

export function BotaoQrCode({ url, titulo }: { url: string; titulo: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button type="button" variant="outline" size="icon" aria-label="Mostrar QR code" onClick={() => setAberto(true)}>
        <QrCode />
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogDescription className="break-all">{url}</DialogDescription>
          </DialogHeader>
          {aberto && <QrCodeLink url={url} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
