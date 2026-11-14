import { describe, expect, it } from "vitest";
import { linkWhatsApp, mascararTelefone, normalizarTelefone, telefoneValido } from "@/lib/telefone";
import { calcularIdade, deBelem, formatarDataHora } from "@/lib/datas";
import { ehEmailTecnico, identificadorParaEmail } from "@/lib/login";
import { gerarSenhaProvisoria, validarSenhaNova } from "@/lib/senha";

describe("telefone", () => {
  it("normaliza e remove o 55", () => {
    expect(normalizarTelefone("+55 (94) 99123-4567")).toBe("94991234567");
    expect(normalizarTelefone("(94) 3321-1234")).toBe("9433211234");
  });
  it("valida DDD + número", () => {
    expect(telefoneValido("94991234567")).toBe(true);
    expect(telefoneValido("991234567")).toBe(false);
  });
  it("aplica máscara progressiva", () => {
    expect(mascararTelefone("9")).toBe("(9");
    expect(mascararTelefone("94991")).toBe("(94) 991");
    expect(mascararTelefone("9433211234")).toBe("(94) 3321-1234");
    expect(mascararTelefone("94991234567")).toBe("(94) 99123-4567");
  });
  it("gera link do WhatsApp com texto", () => {
    expect(linkWhatsApp("(94) 99123-4567", "Oi tudo bem?")).toBe(
      "https://wa.me/5594991234567?text=Oi%20tudo%20bem%3F",
    );
    expect(linkWhatsApp("123")).toBeNull();
  });
});

describe("datas", () => {
  it("calcula idade considerando o aniversário", () => {
    expect(calcularIdade("2008-11-14", "2026-11-14")).toBe(18);
    expect(calcularIdade("2008-11-15", "2026-11-14")).toBe(17);
    expect(calcularIdade("2008-12-01", "2026-11-14")).toBe(17);
  });
  it("usa o fuso de Belém (UTC-3)", () => {
    const d = deBelem("2026-11-14", "19:30");
    expect(d.toISOString()).toBe("2026-11-14T22:30:00.000Z");
    expect(formatarDataHora(d)).toBe("14/11/2026 19:30");
  });
});

describe("login", () => {
  it("converte usuário em e-mail técnico", () => {
    expect(identificadorParaEmail(" Maria.Souza ", "bandinha.local")).toBe("maria.souza@bandinha.local");
    expect(identificadorParaEmail("Joao@Email.com", "bandinha.local")).toBe("joao@email.com");
    expect(ehEmailTecnico("maria@bandinha.local", "bandinha.local")).toBe(true);
  });
});

describe("senha", () => {
  it("gera senhas provisórias fortes e diferentes", () => {
    const a = gerarSenhaProvisoria();
    const b = gerarSenhaProvisoria();
    expect(a).toMatch(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/);
    expect(a).not.toBe(b);
    expect(validarSenhaNova(a)).toBeNull();
  });
  it("rejeita senhas fracas", () => {
    expect(validarSenhaNova("abc")).not.toBeNull();
    expect(validarSenhaNova("somenteletras")).not.toBeNull();
  });
});

import { camposFixosSchema, slugificar, validarResposta, mensagemErroInscricao } from "@/lib/inscricao";

describe("inscrição", () => {
  const base = {
    nome: "Ana Maria",
    nascimento: "2000-01-10",
    telefone: "(94) 99111-1111",
    sexo: "feminino",
    ja_trabalhou: "nao",
    cidade: "Marabá",
    consentimento: "on",
  };
  it("aceita campos fixos válidos e normaliza o telefone", () => {
    const r = camposFixosSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.telefone).toBe("94991111111");
  });
  it("exige equipe e ano quando já trabalhou", () => {
    const r = camposFixosSchema.safeParse({ ...base, ja_trabalhou: "sim" });
    expect(r.success).toBe(false);
  });
  it("exige responsável para menor de 18", () => {
    const r = camposFixosSchema.safeParse({ ...base, nascimento: "2015-01-01" });
    expect(r.success).toBe(false);
    const ok = camposFixosSchema.safeParse({
      ...base,
      nascimento: "2015-01-01",
      resp_nome: "Mãe da Ana",
      resp_telefone: "94992222222",
      resp_consentimento: "on",
    });
    expect(ok.success).toBe(true);
  });
  it("exige consentimento LGPD", () => {
    expect(camposFixosSchema.safeParse({ ...base, consentimento: undefined }).success).toBe(false);
  });
  it("valida respostas por tipo", () => {
    const p = { id: "1", rotulo: "X", ajuda: null, obrigatoria: true, opcoes: ["A", "B"] };
    expect(validarResposta({ ...p, tipo: "multipla" }, "A")).toBeNull();
    expect(validarResposta({ ...p, tipo: "multipla" }, "C")).not.toBeNull();
    expect(validarResposta({ ...p, tipo: "caixas" }, ["A", "B"])).toBeNull();
    expect(validarResposta({ ...p, tipo: "escala" }, 6)).not.toBeNull();
    expect(validarResposta({ ...p, tipo: "texto_curto" }, "")).toBe("Resposta obrigatória.");
    expect(validarResposta({ ...p, obrigatoria: false, tipo: "texto_curto" }, "")).toBeNull();
  });
  it("gera slugs sem acento", () => {
    expect(slugificar("Inscrição Bandinha — EJC 2027!")).toBe("inscricao-bandinha-ejc-2027");
  });
  it("traduz erros do banco", () => {
    expect(mensagemErroInscricao("x", "23505")).toMatch(/telefone/);
    expect(mensagemErroInscricao("FORMULARIO_ESGOTADO")).toMatch(/vagas/);
  });
});

import { gerarCsv } from "@/lib/csv";

describe("csv", () => {
  it("usa ; e escapa aspas e quebras de linha", () => {
    const csv = gerarCsv(["Nome", "Obs"], [["Ana", 'disse "oi"; tchau'], ["Bia", null]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe('﻿Nome;Obs\r\nAna;"disse ""oi""; tchau"\r\nBia;');
  });
});
