"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ativarPush, desativarPush, estadoPush, type EstadoPush } from "@/lib/push-cliente";
import { enviarTeste, removerInscricao, salvarInscricao, salvarPreferencia } from "@/server/actions/notificacoes";

type Prefs = { notif_lembrete: boolean; notif_checkins: boolean; notif_comentarios: boolean; notif_avisos: boolean };

const OPCOES: { campo: keyof Prefs; titulo: string; desc: string }[] = [
  { campo: "notif_lembrete", titulo: "Lembrete da leitura", desc: "No fim do dia, se você ainda não marcou a leitura." },
  { campo: "notif_checkins", titulo: "Leituras dos amigos", desc: "Quando alguém dos seus desafios marcar a leitura." },
  { campo: "notif_comentarios", titulo: "Comentários", desc: "Quando alguém comentar na sua leitura." },
  { campo: "notif_avisos", titulo: "Avisos da equipe", desc: "Mensagens programadas pelos administradores." },
];

export function NotificacoesPerfil({ prefs }: { prefs: Prefs }) {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [valores, setValores] = useState(prefs);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    estadoPush().then(setEstado);
  }, []);

  function ativar() {
    iniciar(async () => {
      const r = await ativarPush();
      if ("erro" in r) {
        toast.error(r.erro);
        setEstado(await estadoPush());
        return;
      }
      const s = await salvarInscricao(r.inscricao, r.aparelho);
      if (!s.ok) return void toast.error(s.erro);
      setEstado("ativo");
      toast.success("Notificações ativadas neste aparelho! 🔔");
    });
  }

  function desativar() {
    iniciar(async () => {
      const endpoint = await desativarPush();
      if (endpoint) await removerInscricao(endpoint);
      setEstado("inativo");
      toast.success("Notificações desativadas neste aparelho.");
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 size-5 text-primary" aria-hidden />
        <div className="flex-1">
          <h2 className="font-semibold">Notificações</h2>
          {estado === "ativo" && <p className="text-sm text-muted-foreground">Ativadas neste aparelho.</p>}
          {estado === "inativo" && <p className="text-sm text-muted-foreground">Receba o lembrete da leitura e as novidades do seu grupo.</p>}
          {estado === "instalar-primeiro" && (
            <p className="text-sm text-muted-foreground">
              No iPhone, as notificações só funcionam com o app na tela de início. Instale pelo botão acima e abra o app por lá.
            </p>
          )}
          {estado === "bloqueado" && (
            <p className="text-sm text-muted-foreground">
              Você bloqueou as notificações. Libere nas configurações do navegador (ícone de cadeado ao lado do endereço → Notificações) e volte aqui.
            </p>
          )}
          {estado === "sem-suporte" && <p className="text-sm text-muted-foreground">Este navegador não aceita notificações. Tente o Chrome.</p>}
        </div>
      </div>

      {estado === "inativo" && (
        <Button className="w-full" onClick={ativar} disabled={pendente}>
          <Bell /> {pendente ? "Ativando…" : "Ativar notificações"}
        </Button>
      )}

      {estado === "ativo" && (
        <>
          <ul className="space-y-3">
            {OPCOES.map((o) => (
              <li key={o.campo} className="flex items-center gap-3">
                <label htmlFor={`nt-${o.campo}`} className="flex-1">
                  <span className="block text-sm font-medium">{o.titulo}</span>
                  <span className="block text-xs text-muted-foreground">{o.desc}</span>
                </label>
                <Switch
                  id={`nt-${o.campo}`}
                  checked={valores[o.campo]}
                  onCheckedChange={(v) => {
                    setValores((x) => ({ ...x, [o.campo]: v }));
                    salvarPreferencia(o.campo, v).then((r) => {
                      if (!r.ok) {
                        toast.error(r.erro);
                        setValores((x) => ({ ...x, [o.campo]: !v }));
                      }
                    });
                  }}
                />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await enviarTeste();
                  if (!r.ok) toast.error(r.erro);
                  else toast.success("Enviada! Confira a notificação.");
                })
              }
            >
              <Send /> Enviar um teste
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" disabled={pendente} onClick={desativar}>
              <BellOff /> Desativar neste aparelho
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
