import { describe, expect, it } from "vitest";
import { calcularIdade, capitalizar, deBelem, formatarDataHora, rotuloDia, somarDias } from "@/lib/datas";
import { ehEmailTecnico, identificadorParaEmail } from "@/lib/login";
import { gerarSenhaProvisoria, validarSenhaNova } from "@/lib/senha";
import { LIVROS, formatarLeitura, livro, totalCapitulos } from "@/lib/biblia";
import { linkWhatsApp, mascararTelefone } from "@/lib/telefone";

describe("Bíblia", () => {
  it("tem 66 livros e 1189 capítulos (929 AT + 260 NT)", () => {
    expect(LIVROS).toHaveLength(66);
    expect(totalCapitulos()).toBe(1189);
    expect(totalCapitulos("AT")).toBe(929);
    expect(totalCapitulos("NT")).toBe(260);
    expect(new Set(LIVROS.map((l) => l.id)).size).toBe(66);
  });
  it("formata a leitura", () => {
    expect(formatarLeitura("mt", 5, 7)).toBe("Mateus 5–7");
    expect(formatarLeitura("sl", 23, 23)).toBe("Salmos 23");
    expect(formatarLeitura("jd", 1, 1)).toBe("Judas");
    expect(livro("job")?.nome).toBe("Jó");
    expect(livro("jo")?.nome).toBe("João");
  });
});

describe("datas", () => {
  it("calcula idade considerando o aniversário", () => {
    expect(calcularIdade("2008-11-14", "2026-11-14")).toBe(18);
    expect(calcularIdade("2008-11-15", "2026-11-14")).toBe(17);
  });
  it("usa o fuso de Belém (UTC-3)", () => {
    const d = deBelem("2026-11-14", "19:30");
    expect(d.toISOString()).toBe("2026-11-14T22:30:00.000Z");
    expect(formatarDataHora(d)).toBe("14/11/2026 19:30");
  });
  it("rótulos de dia relativos", () => {
    expect(rotuloDia("2026-11-22", "2026-11-22")).toBe("hoje");
    expect(rotuloDia("2026-11-21", "2026-11-22")).toBe("ontem");
    expect(rotuloDia("2026-11-19", "2026-11-22")).toBe("quinta, 19/11");
    expect(rotuloDia("2026-10-01", "2026-11-22")).toBe("01/10/2026");
  });
  it("soma dias atravessando meses", () => {
    expect(somarDias("2026-11-30", 1)).toBe("2026-12-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("capitaliza só a primeira letra", () => {
    expect(capitalizar("sábado, 14 de novembro")).toBe("Sábado, 14 de novembro");
  });
});

describe("login e senha", () => {
  it("aceita e-mail ou usuário técnico", () => {
    expect(identificadorParaEmail("Joao@Email.com", "x.local")).toBe("joao@email.com");
    expect(identificadorParaEmail(" Maria ", "x.local")).toBe("maria@x.local");
    expect(ehEmailTecnico("maria@x.local", "x.local")).toBe(true);
  });
  it("gera senhas provisórias fortes e rejeita fracas", () => {
    const a = gerarSenhaProvisoria();
    expect(a).toMatch(/^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$/);
    expect(validarSenhaNova(a)).toBeNull();
    expect(validarSenhaNova("abc")).not.toBeNull();
    expect(validarSenhaNova("somenteletras")).not.toBeNull();
  });
});

describe("telefone", () => {
  it("máscara e link de WhatsApp", () => {
    expect(mascararTelefone("94991234567")).toBe("(94) 99123-4567");
    expect(linkWhatsApp("(94) 99123-4567", "oi")).toBe("https://wa.me/5594991234567?text=oi");
  });
});

import { formatarReferencias, interpretarData, interpretarLeitura, mapearColunas } from "@/lib/plano";

describe("plano de leitura", () => {
  const ok = (t: string) => interpretarLeitura(t).referencias;
  it("entende abreviações, nomes e vários livros", () => {
    expect(ok("Gn 1-3")).toEqual([{ livro: "gn", inicio: 1, fim: 3 }]);
    expect(ok("Gênesis 1–3; Salmos 23")).toEqual([{ livro: "gn", inicio: 1, fim: 3 }, { livro: "sl", inicio: 23, fim: 23 }]);
    expect(ok("1 Coríntios 13")).toEqual([{ livro: "1co", inicio: 13, fim: 13 }]);
    expect(ok("1Co 13")).toEqual([{ livro: "1co", inicio: 13, fim: 13 }]);
    expect(ok("I Samuel 3")).toEqual([{ livro: "1sm", inicio: 3, fim: 3 }]);
    expect(ok("Mateus 5:1-12")).toEqual([{ livro: "mt", inicio: 5, fim: 5 }]);
    expect(ok("Gn 1:1-2:3")).toEqual([{ livro: "gn", inicio: 1, fim: 2 }]);
    expect(ok("Salmos 1, 2 e 3")).toEqual([1, 2, 3].map((n) => ({ livro: "sl", inicio: n, fim: n })));
    expect(ok("Gn 1, Mt 1")).toEqual([{ livro: "gn", inicio: 1, fim: 1 }, { livro: "mt", inicio: 1, fim: 1 }]);
    expect(ok("Jó 1")).toEqual([{ livro: "job", inicio: 1, fim: 1 }]);
    expect(ok("Jo 3")).toEqual([{ livro: "jo", inicio: 3, fim: 3 }]);
    expect(ok("João 3")).toEqual([{ livro: "jo", inicio: 3, fim: 3 }]);
    expect(ok("Judas")).toEqual([{ livro: "jd", inicio: 1, fim: 1 }]);
    expect(ok("Rute")).toEqual([{ livro: "rt", inicio: 1, fim: 4 }]);
  });
  it("aponta erros", () => {
    expect(interpretarLeitura("Gn 51").erro).toMatch(/50 capítulo/);
    expect(interpretarLeitura("Livro Inventado 3").erro).toMatch(/não reconhecido/);
  });
  it("formata referências", () => {
    expect(formatarReferencias(ok("gn 1-3; sl 23"))).toBe("Gênesis 1–3; Salmos 23");
  });
  it("lê datas de planilha", () => {
    expect(interpretarData("23/11/2026", 2026)).toBe("2026-11-23");
    expect(interpretarData("23/11", 2026)).toBe("2026-11-23");
    expect(interpretarData("2026-11-23", 2026)).toBe("2026-11-23");
    expect(interpretarData(46349, 2026)).toBe("2026-11-23");
    expect(interpretarData(new Date(Date.UTC(2026, 10, 23)), 2026)).toBe("2026-11-23");
    expect(interpretarData("31/02/2026", 2026)).toBeNull();
  });
  it("acha as colunas pelo cabeçalho", () => {
    expect(mapearColunas(["Dia", "Leitura bíblica", "Tema", "Devocional"])).toEqual({ data: 0, leitura: 1, titulo: 2, texto: 3 });
  });
});

describe("plano: intervalos com 'a'", () => {
  it("entende '4 a 7' e '1a 4'", () => {
    expect(interpretarLeitura("Gênesis 4 a 7").referencias).toEqual([{ livro: "gn", inicio: 4, fim: 7 }]);
    expect(interpretarLeitura("Malaquias 1a 4").referencias).toEqual([{ livro: "ml", inicio: 1, fim: 4 }]);
    expect(interpretarLeitura("Salmos 95, 97 a 99").referencias).toEqual([
      { livro: "sl", inicio: 95, fim: 95 },
      { livro: "sl", inicio: 97, fim: 99 },
    ]);
  });
});

describe("plano: casos do plano cronológico", () => {
  it("não confunde Isaías com numeral romano e aceita I Samuel", () => {
    expect(interpretarLeitura("Isaías 1 a 4").referencias).toEqual([{ livro: "is", inicio: 1, fim: 4 }]);
    expect(interpretarLeitura("I Samuel 3").referencias).toEqual([{ livro: "1sm", inicio: 3, fim: 3 }]);
  });
  it("separa livros ligados por 'e'", () => {
    expect(interpretarLeitura("2 Samuel 5:1-10 e 1 Crônicas 11-12").referencias).toEqual([
      { livro: "2sm", inicio: 5, fim: 5 },
      { livro: "1cr", inicio: 11, fim: 12 },
    ]);
  });
});
