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
