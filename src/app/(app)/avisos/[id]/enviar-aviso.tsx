"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Copy, History, MessageCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatarDataHora } from "@/lib/datas";
import { linkWhatsApp } from "@/lib/telefone";
import type { Funcao } from "@/lib/dominio";
import { registrarEnvio } from "@/server/actions/avisos";
import { cn } from "@/lib/utils";

type Membro = { id: string; nome: string; sexo: "masculino" | "feminino"; telefone: string; funcoes: string[] };
type Evento = { id: string; rotulo: string; membros: string[] };
type Envio = { id: string; quando: string; destinatarios: number; filtro: string | null; por: string };

const chave = (avisoId: string) => `bandinha-enviados-${avisoId}`;

export function EnviarAviso({
  aviso,
  membros,
  semTelefone,
  funcoes,
  eventos,
  historico,
}: {
  aviso: { id: string; titulo: string; texto: string };
  membros: Membro[];
  semTelefone: string[];
  funcoes: Funcao[];
  eventos: Evento[];
  historico: Envio[];
}) {
  const [sexo, setSexo] = useState<"" | "masculino" | "feminino">("");
  const [funcoesSel, setFuncoesSel] = useState<string[]>([]);
  const [eventoId, setEventoId] = useState("");
  const [mensagem, setMensagem] = useState(`*${aviso.titulo}*\n\n${aviso.texto}\n\n— Coordenação da Bandinha 🎶`);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [pendente, iniciar] = useTransition();

  // "Já enviei" fica salvo só neste aparelho, para retomar o envio depois.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(chave(aviso.id));
      if (salvo) setEnviados(new Set(JSON.parse(salvo)));
    } catch {
      /* armazenamento indisponível */
    }
  }, [aviso.id]);
  const marcar = (id: string) =>
    setEnviados((s) => {
      const n = new Set(s).add(id);
      try {
        localStorage.setItem(chave(aviso.id), JSON.stringify([...n]));
      } catch {
        /* ignora */
      }
      return n;
    });

  const evento = eventos.find((e) => e.id === eventoId);
  const destinatarios = useMemo(
    () =>
      membros.filter(
        (m) =>
          (!sexo || m.sexo === sexo) &&
          (!funcoesSel.length || m.funcoes.some((f) => funcoesSel.includes(f))) &&
          (!evento || evento.membros.includes(m.id)),
      ),
    [membros, sexo, funcoesSel, evento],
  );

  const descricaoFiltro = [
    sexo ? (sexo === "masculino" ? "Homens" : "Mulheres") : null,
    funcoesSel.length ? funcoes.filter((f) => funcoesSel.includes(f.id)).map((f) => f.nome).join(", ") : null,
    evento ? `Escala: ${evento.rotulo}` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "Todos os membros ativos";

  const chip = (ativo: boolean) => cn("min-h-9 rounded-full border px-3 text-sm", ativo ? "border-primary bg-primary text-primary-foreground" : "bg-background");

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_24rem] [&>*]:min-w-0">
      <div className="space-y-4">
        <section className="space-y-4 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">1. Para quem?</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sexo">
            {(
              [
                ["", "Todos"],
                ["masculino", "Homens"],
                ["feminino", "Mulheres"],
              ] as const
            ).map(([v, r]) => (
              <button key={r} aria-pressed={sexo === v} onClick={() => setSexo(v)} className={chip(sexo === v)}>{r}</button>
            ))}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm text-muted-foreground">Por função (qualquer uma das marcadas)</legend>
            <div className="flex flex-wrap gap-2">
              {funcoes.map((f) => {
                const ativo = funcoesSel.includes(f.id);
                return (
                  <button
                    key={f.id}
                    aria-pressed={ativo}
                    onClick={() => setFuncoesSel((s) => (ativo ? s.filter((x) => x !== f.id) : [...s, f.id]))}
                    className={chip(ativo)}
                  >
                    {f.nome}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="env-evento">Só quem está na escala de</Label>
            <select id="env-evento" value={eventoId} onChange={(e) => setEventoId(e.target.value)} className="h-11 w-full rounded-lg border border-input bg-background px-3 md:h-10">
              <option value="">Qualquer escala</option>
              {eventos.map((e) => <option key={e.id} value={e.id}>{e.rotulo}</option>)}
            </select>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">2. Mensagem</h2>
          <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={8} aria-label="Mensagem para WhatsApp" />
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(mensagem);
              toast.success("Mensagem copiada! Cole no grupo ou nas conversas.");
            }}
          >
            <Copy /> Copiar mensagem
          </Button>
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">3. Enviar um a um ({destinatarios.length})</h2>
            <span className="text-sm text-muted-foreground">
              {destinatarios.filter((d) => enviados.has(d.id)).length} já abertos
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Toque em cada nome: o WhatsApp abre com a mensagem pronta.</p>
          {destinatarios.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Ninguém com esses filtros (e com telefone).</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {destinatarios.map((m) => {
                const link = linkWhatsApp(m.telefone, mensagem);
                const feito = enviados.has(m.id);
                return (
                  <li key={m.id}>
                    <a
                      href={link ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => marcar(m.id)}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-xl border px-3 transition-colors",
                        feito ? "border-emerald-300 bg-emerald-50" : "bg-background hover:border-[#128c4a]",
                      )}
                    >
                      {feito ? <Check className="size-5 text-emerald-700" aria-hidden /> : <MessageCircle className="size-5 text-[#128c4a]" aria-hidden />}
                      <span className="flex-1 truncate font-medium">{m.nome}</span>
                      {feito && <span className="text-xs text-emerald-800">aberto</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          {semTelefone.length > 0 && (
            <p className="text-xs text-muted-foreground">Sem telefone cadastrado: {semTelefone.join(", ")}.</p>
          )}
          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button
              disabled={pendente || destinatarios.length === 0}
              onClick={() =>
                iniciar(async () => {
                  const r = await registrarEnvio(aviso.id, { sexo, funcoes: funcoesSel, evento: eventoId }, descricaoFiltro, destinatarios.length);
                  if (!r.ok) return void toast.error(r.erro);
                  toast.success("Envio registrado no histórico.");
                })
              }
            >
              <Save /> Registrar envio no histórico
            </Button>
            {enviados.size > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEnviados(new Set());
                  try {
                    localStorage.removeItem(chave(aviso.id));
                  } catch {
                    /* ignora */
                  }
                }}
              >
                Limpar marcações
              </Button>
            )}
          </div>
        </section>
      </div>

      <aside className="space-y-3 rounded-xl border bg-card p-4 lg:self-start">
        <h2 className="flex items-center gap-2 font-semibold">
          <History className="size-4" aria-hidden /> Histórico de envios
        </h2>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum envio registrado ainda.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {historico.map((h) => (
              <li key={h.id} className="border-t pt-3 first:border-0 first:pt-0">
                <p className="font-medium">
                  {h.destinatarios} destinatário(s) · {formatarDataHora(h.quando, "dd/MM/yyyy HH:mm")}
                </p>
                <p className="text-muted-foreground">{h.filtro}</p>
                <p className="text-xs text-muted-foreground">por {h.por}</p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
