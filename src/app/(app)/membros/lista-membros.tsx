"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Copy, Download, MessageCircle, Phone, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EstadoVazio } from "@/components/estado-vazio";
import { ROTULO_NIVEL, ROTULO_TIPO_FUNCAO, situacaoFaltas, type Funcao, type TipoFuncao } from "@/lib/dominio";
import type { MembroResumo } from "@/lib/membros";
import { linkLigar, linkWhatsApp, mascararTelefone } from "@/lib/telefone";
import { baixarCsv, gerarCsv } from "@/lib/csv";
import { slugificar } from "@/lib/inscricao";
import { cn } from "@/lib/utils";

const TODOS = "__todos";
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function ListaMembros({
  membros,
  funcoes,
  presenca,
  limiteFaltas,
  nomeEdicao,
}: {
  membros: MembroResumo[];
  funcoes: Funcao[];
  presenca: Record<string, { faltas: number; percentual: number | null }>;
  limiteFaltas: number;
  nomeEdicao: string;
}) {
  const [busca, setBusca] = useState("");
  const [sexo, setSexo] = useState("");
  const [funcao, setFuncao] = useState("");
  const [tipo, setTipo] = useState<"" | TipoFuncao>("");
  const [status, setStatus] = useState<"ativos" | "inativos" | "todos">("ativos");

  const nomeFuncao = useMemo(() => Object.fromEntries(funcoes.map((f) => [f.id, f])), [funcoes]);

  const filtrados = useMemo(() => {
    const b = normalizar(busca.trim());
    return membros.filter((m) => {
      if (status === "ativos" && !m.ativo) return false;
      if (status === "inativos" && m.ativo) return false;
      if (sexo && m.sexo !== sexo) return false;
      if (funcao && !m.funcoes.includes(funcao)) return false;
      if (tipo && !m.funcoes.some((f) => nomeFuncao[f]?.tipo === tipo)) return false;
      if (b && !normalizar(`${m.nome} ${m.cidade ?? ""}`).includes(b)) return false;
      return true;
    });
  }, [membros, busca, sexo, funcao, tipo, status, nomeFuncao]);

  const comTelefone = filtrados.filter((m) => m.telefone);

  async function copiarNumeros() {
    const texto = comTelefone.map((m) => `${m.nome}: ${mascararTelefone(m.telefone)}`).join("\n");
    await navigator.clipboard.writeText(texto);
    toast.success(`${comTelefone.length} números copiados!`);
  }

  function exportar() {
    const cab = ["Nome", "Sexo", "Idade", "Telefone", "Cidade", "Funções", "Nível", "Ativo", "Faltas", "% presença", "Observações"];
    const linhas = filtrados.map((m) => [
      m.nome,
      m.sexo === "masculino" ? "Masculino" : "Feminino",
      m.idade,
      m.telefone ? mascararTelefone(m.telefone) : "",
      m.cidade,
      m.funcoes.map((f) => nomeFuncao[f]?.nome).filter(Boolean).join(", "),
      m.nivel ? ROTULO_NIVEL[m.nivel] : "",
      m.ativo ? "Sim" : "Não",
      presenca[m.id]?.faltas ?? 0,
      presenca[m.id]?.percentual ?? "",
      m.observacoes,
    ]);
    baixarCsv(`membros-${slugificar(nomeEdicao)}`, gerarCsv(cab, linhas));
  }

  if (membros.length === 0) {
    return (
      <EstadoVazio
        icone={Users}
        titulo="Nenhum membro ainda"
        descricao="Cadastre manualmente ou use “Puxar para a equipe” na Seleção."
        acao={
          <Button asChild variant="outline">
            <Link href="/selecao">Ir para Seleção</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome ou cidade" aria-label="Buscar" className="pl-9" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select value={sexo || TODOS} onValueChange={(v) => setSexo(v === TODOS ? "" : v)}>
          <SelectTrigger className="w-full" aria-label="Sexo"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os sexos</SelectItem>
            <SelectItem value="masculino">Homens</SelectItem>
            <SelectItem value="feminino">Mulheres</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tipo || TODOS} onValueChange={(v) => setTipo(v === TODOS ? "" : (v as TipoFuncao))}>
          <SelectTrigger className="w-full" aria-label="Tipo de função"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Voz e instrumento</SelectItem>
            {(Object.keys(ROTULO_TIPO_FUNCAO) as TipoFuncao[]).map((t) => (
              <SelectItem key={t} value={t}>Só {ROTULO_TIPO_FUNCAO[t].toLowerCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={funcao || TODOS} onValueChange={(v) => setFuncao(v === TODOS ? "" : v)}>
          <SelectTrigger className="w-full" aria-label="Função"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Qualquer função</SelectItem>
            {funcoes.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-full" aria-label="Situação"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {filtrados.length} {filtrados.length === 1 ? "membro" : "membros"}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copiarNumeros} disabled={!comTelefone.length}>
            <Copy /> Copiar números
          </Button>
          <Button variant="outline" size="sm" onClick={exportar}>
            <Download /> CSV
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {filtrados.map((m) => {
          const whats = linkWhatsApp(m.telefone);
          const ligar = linkLigar(m.telefone);
          const p = presenca[m.id];
          const sit = situacaoFaltas(p?.faltas ?? 0, limiteFaltas);
          return (
            <li key={m.id} className={cn("flex items-center rounded-xl border bg-card", !m.ativo && "opacity-70")}>
              <Link href={`/membros/${m.id}`} className="min-w-0 flex-1 p-3">
                <p className="truncate font-semibold">{m.nome}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {[m.idade ? `${m.idade} anos` : null, m.cidade, m.nivel ? ROTULO_NIVEL[m.nivel] : null].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.funcoes.map((f) => nomeFuncao[f]).filter(Boolean).map((f) => (
                    <span key={f.id} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{f.nome}</span>
                  ))}
                  {!m.ativo && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">Inativo</span>}
                  {sit !== "ok" && (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", sit === "passou" ? "bg-rose-100 text-rose-900" : "bg-amber-100 text-amber-900")}>
                      {p?.faltas} {p?.faltas === 1 ? "falta" : "faltas"}
                    </span>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-1 pr-2">
                {ligar && (
                  <Button asChild variant="ghost" size="icon">
                    <a href={ligar} aria-label={`Ligar para ${m.nome}`}><Phone /></a>
                  </Button>
                )}
                {whats && (
                  <Button asChild variant="ghost" size="icon" className="text-[#128c4a]">
                    <a href={whats} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${m.nome}`}><MessageCircle /></a>
                  </Button>
                )}
                <ChevronRight className="hidden size-5 text-muted-foreground sm:block" aria-hidden />
              </div>
            </li>
          );
        })}
      </ul>
      {filtrados.length === 0 && (
        <p className="rounded-xl border border-dashed bg-card p-8 text-center text-muted-foreground">Ninguém encontrado com esses filtros.</p>
      )}
    </div>
  );
}
