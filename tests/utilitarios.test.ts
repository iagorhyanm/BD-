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
