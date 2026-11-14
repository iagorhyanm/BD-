"use client";

import { useMemo, useState, useTransition } from "react";
import { CircleCheckBig } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputTelefone } from "@/components/input-telefone";
import { AlertaErro } from "@/components/alerta-erro";
import { calcularIdade, hojeEmBelem } from "@/lib/datas";
import { camposFixosSchema, validarResposta, type Pergunta, type Resposta } from "@/lib/inscricao";
import { enviarInscricao } from "@/server/actions/inscricao-publica";
import { cn } from "@/lib/utils";

type Erros = Record<string, string>;

export function FormularioPublico({
  slug,
  perguntas,
  textoLgpd,
  carregadoEm,
}: {
  slug: string;
  perguntas: Pergunta[];
  textoLgpd: string;
  carregadoEm: number;
}) {
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({});
  const [nascimento, setNascimento] = useState("");
  const [jaTrabalhou, setJaTrabalhou] = useState<"" | "sim" | "nao">("");
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const idade = useMemo(
    () => (/^\d{4}-\d{2}-\d{2}$/.test(nascimento) && nascimento <= hojeEmBelem() ? calcularIdade(nascimento) : null),
    [nascimento],
  );
  const menor = idade !== null && idade < 18;

  const definir = (id: string, v: Resposta) => {
    setRespostas((r) => ({ ...r, [id]: v }));
    setErros((e) => {
      const resto = { ...e };
      delete resto[`p_${id}`];
      return resto;
    });
  };

  function focarPrimeiroErro(es: Erros) {
    const primeiro = Object.keys(es)[0];
    if (!primeiro) return;
    const el = document.querySelector<HTMLElement>(`[data-campo="${primeiro}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.querySelector<HTMLElement>("input, textarea, select, button")?.focus({ preventScroll: true });
  }

  function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("respostas", JSON.stringify(respostas));

    // Validação no navegador (o servidor valida de novo).
    const es: Erros = {};
    const fixos = camposFixosSchema.safeParse(Object.fromEntries(fd));
    if (!fixos.success) for (const i of fixos.error.issues) es[String(i.path[0])] ??= i.message;
    for (const p of perguntas) {
      const erro = validarResposta(p, respostas[p.id]);
      if (erro) es[`p_${p.id}`] = erro;
    }
    setErros(es);
    if (Object.keys(es).length) {
      setErroGeral("Confira os campos destacados.");
      return focarPrimeiroErro(es);
    }

    setErroGeral(null);
    iniciar(async () => {
      const r = await enviarInscricao(slug, fd);
      if (r.ok) {
        setSucesso(r.mensagem);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErroGeral(r.erro);
        if (r.campos) {
          setErros(r.campos);
          focarPrimeiroErro(r.campos);
        }
      }
    });
  }

  if (sucesso) {
    return (
      <div role="status" className="flex flex-col items-center rounded-2xl border bg-card px-6 py-10 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CircleCheckBig className="size-9" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold">Inscrição enviada!</h2>
        <p className="mt-2 max-w-md whitespace-pre-line text-muted-foreground">{sucesso}</p>
      </div>
    );
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="space-y-4">
      {/* Anti-spam: honeypot invisível + horário de carregamento */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Site <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="t" value={carregadoEm} />

      <Bloco titulo="Seus dados">
        <Campo id="nome" rotulo="Nome completo" erro={erros.nome} obrigatorio>
          <Input id="nome" name="nome" autoComplete="name" autoCapitalize="words" maxLength={120} />
        </Campo>

        <Campo
          id="nascimento"
          rotulo="Data de nascimento"
          erro={erros.nascimento}
          obrigatorio
          ajuda={idade !== null ? `Idade: ${idade} anos` : undefined}
        >
          <Input
            id="nascimento"
            name="nascimento"
            type="date"
            max={hojeEmBelem()}
            min="1920-01-01"
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
          />
        </Campo>

        <Campo id="telefone" rotulo="Telefone / WhatsApp" erro={erros.telefone} obrigatorio>
          <InputTelefone id="telefone" name="telefone" />
        </Campo>

        <Campo id="sexo" rotulo="Sexo" erro={erros.sexo} obrigatorio grupo>
          <div className="grid grid-cols-2 gap-2">
            <OpcaoCartao tipo="radio" name="sexo" value="masculino" rotulo="Masculino" />
            <OpcaoCartao tipo="radio" name="sexo" value="feminino" rotulo="Feminino" />
          </div>
        </Campo>

        <Campo id="cidade" rotulo="Cidade" erro={erros.cidade} obrigatorio>
          <Input id="cidade" name="cidade" autoComplete="address-level2" autoCapitalize="words" defaultValue="" placeholder="Ex.: Marabá" />
        </Campo>

        <Campo id="ja_trabalhou" rotulo="Já trabalhou no EJC?" erro={erros.ja_trabalhou} obrigatorio grupo>
          <div className="grid grid-cols-2 gap-2">
            <OpcaoCartao tipo="radio" name="ja_trabalhou" value="sim" rotulo="Sim" onChange={() => setJaTrabalhou("sim")} />
            <OpcaoCartao tipo="radio" name="ja_trabalhou" value="nao" rotulo="Não" onChange={() => setJaTrabalhou("nao")} />
          </div>
        </Campo>

        {jaTrabalhou === "sim" && (
          <div className="grid gap-4 rounded-xl bg-muted/60 p-3 sm:grid-cols-[1fr_8rem]">
            <Campo id="equipe_anterior" rotulo="Em qual equipe?" erro={erros.equipe_anterior} obrigatorio>
              <Input id="equipe_anterior" name="equipe_anterior" placeholder="Ex.: Bandinha, Cozinha…" />
            </Campo>
            <Campo id="ano_anterior" rotulo="Em que ano?" erro={erros.ano_anterior} obrigatorio>
              <Input id="ano_anterior" name="ano_anterior" type="number" inputMode="numeric" min={1980} placeholder="2025" />
            </Campo>
          </div>
        )}
      </Bloco>

      {perguntas.length > 0 && (
        <Bloco titulo="Sobre você e a música">
          {perguntas.map((p) => (
            <CampoPergunta
              key={p.id}
              pergunta={p}
              valor={respostas[p.id]}
              erro={erros[`p_${p.id}`]}
              aoMudar={(v) => definir(p.id, v)}
            />
          ))}
        </Bloco>
      )}

      {menor && (
        <Bloco titulo="Responsável" descricao="Como você tem menos de 18 anos, precisamos dos dados e da autorização de um responsável.">
          <Campo id="resp_nome" rotulo="Nome do responsável" erro={erros.resp_nome} obrigatorio>
            <Input id="resp_nome" name="resp_nome" autoCapitalize="words" />
          </Campo>
          <Campo id="resp_telefone" rotulo="Telefone do responsável" erro={erros.resp_telefone} obrigatorio>
            <InputTelefone id="resp_telefone" name="resp_telefone" />
          </Campo>
          <Campo id="resp_consentimento" erro={erros.resp_consentimento} grupo>
            <OpcaoCartao
              tipo="checkbox"
              name="resp_consentimento"
              rotulo="Eu, responsável, autorizo a participação e o uso dos dados conforme o termo abaixo."
            />
          </Campo>
        </Bloco>
      )}

      <Bloco titulo="Consentimento (LGPD)">
        <p className="rounded-lg bg-muted/60 p-3 text-sm whitespace-pre-line text-muted-foreground">{textoLgpd}</p>
        <Campo id="consentimento" erro={erros.consentimento} grupo>
          <OpcaoCartao tipo="checkbox" name="consentimento" rotulo="Li e concordo com o termo acima." />
        </Campo>
      </Bloco>

      <AlertaErro mensagem={erroGeral} />

      <Button type="submit" size="lg" className="h-14 w-full text-base" disabled={pendente}>
        {pendente ? "Enviando…" : "Enviar inscrição"}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function Bloco({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {descricao && <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

function Campo({
  id,
  rotulo,
  ajuda,
  erro,
  obrigatorio,
  grupo,
  children,
}: {
  id: string;
  rotulo?: string;
  ajuda?: string | null;
  erro?: string;
  obrigatorio?: boolean;
  grupo?: boolean;
  children: React.ReactNode;
}) {
  const idErro = `${id}-erro`;
  const idAjuda = `${id}-ajuda`;
  const Rotulo = grupo ? "legend" : "label";
  const Envoltorio = grupo ? "fieldset" : "div";
  return (
    <Envoltorio
      data-campo={id}
      className="space-y-2"
      aria-invalid={erro ? true : undefined}
      aria-describedby={[erro && idErro, ajuda && idAjuda].filter(Boolean).join(" ") || undefined}
    >
      {rotulo && (
        <Rotulo {...(!grupo ? { htmlFor: id } : {})} className="block text-sm font-medium">
          {rotulo}
          {obrigatorio && (
            <span className="text-destructive" aria-hidden>
              {" "}
              *
            </span>
          )}
        </Rotulo>
      )}
      <div className={cn(erro && "[&_input:not([type=radio]):not([type=checkbox])]:border-destructive [&_select]:border-destructive [&_textarea]:border-destructive")}>
        {children}
      </div>
      {ajuda && (
        <p id={idAjuda} className="text-sm text-muted-foreground">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={idErro} className="text-sm font-medium text-destructive">
          {erro}
        </p>
      )}
    </Envoltorio>
  );
}

/** Radio/checkbox nativo em formato de cartão (alvo de toque grande). */
function OpcaoCartao({
  tipo,
  rotulo,
  ...props
}: { tipo: "radio" | "checkbox"; rotulo: string } & Omit<React.ComponentProps<"input">, "type">) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50">
      <input type={tipo} className="size-5 shrink-0 accent-[var(--primary)]" {...props} />
      <span>{rotulo}</span>
    </label>
  );
}

function CampoPergunta({
  pergunta: p,
  valor,
  erro,
  aoMudar,
}: {
  pergunta: Pergunta;
  valor: Resposta | undefined;
  erro?: string;
  aoMudar: (v: Resposta) => void;
}) {
  const id = `p_${p.id}`;
  const grupo = ["multipla", "caixas", "sim_nao", "escala"].includes(p.tipo);

  let controle: React.ReactNode;
  switch (p.tipo) {
    case "texto_curto":
      controle = <Input id={id} maxLength={300} value={(valor as string) ?? ""} onChange={(e) => aoMudar(e.target.value)} />;
      break;
    case "texto_longo":
      controle = <Textarea id={id} rows={4} maxLength={3000} value={(valor as string) ?? ""} onChange={(e) => aoMudar(e.target.value)} />;
      break;
    case "lista":
      controle = (
        <select
          id={id}
          value={(valor as string) ?? ""}
          onChange={(e) => aoMudar(e.target.value || null)}
          className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base"
        >
          <option value="">Selecione…</option>
          {p.opcoes.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
      break;
    case "multipla":
      controle = (
        <div className="grid gap-2">
          {p.opcoes.map((o) => (
            <OpcaoCartao key={o} tipo="radio" name={id} rotulo={o} checked={valor === o} onChange={() => aoMudar(o)} />
          ))}
        </div>
      );
      break;
    case "caixas": {
      const marcadas = Array.isArray(valor) ? valor : [];
      controle = (
        <div className="grid gap-2">
          {p.opcoes.map((o) => (
            <OpcaoCartao
              key={o}
              tipo="checkbox"
              rotulo={o}
              checked={marcadas.includes(o)}
              onChange={(e) => aoMudar(e.target.checked ? [...marcadas, o] : marcadas.filter((x) => x !== o))}
            />
          ))}
        </div>
      );
      break;
    }
    case "sim_nao":
      controle = (
        <div className="grid grid-cols-2 gap-2">
          <OpcaoCartao tipo="radio" name={id} rotulo="Sim" checked={valor === "sim"} onChange={() => aoMudar("sim")} />
          <OpcaoCartao tipo="radio" name={id} rotulo="Não" checked={valor === "nao"} onChange={() => aoMudar("nao")} />
        </div>
      );
      break;
    case "escala":
      controle = (
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="flex h-12 cursor-pointer items-center justify-center rounded-xl border bg-background text-lg font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
            >
              <input type="radio" name={id} className="sr-only" checked={valor === n} onChange={() => aoMudar(n)} />
              {n}
            </label>
          ))}
        </div>
      );
      break;
  }

  return (
    <Campo id={id} rotulo={p.rotulo} ajuda={p.ajuda} erro={erro} obrigatorio={p.obrigatoria} grupo={grupo}>
      {controle}
    </Campo>
  );
}
