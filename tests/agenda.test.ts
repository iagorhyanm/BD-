import { describe, expect, it, vi, afterEach } from "vitest";
import { descreverAgenda, personalizar, proximoEnvio } from "@/lib/agenda";

// Belém = UTC-3, sem horário de verão.
const utc = (s: string) => new Date(s);
afterEach(() => vi.useRealTimers());

describe("proximoEnvio", () => {
  it("diária: hoje se ainda não passou, senão amanhã", () => {
    vi.useFakeTimers({ now: utc("2026-11-24T08:00:00Z") }); // 05:00 em Belém
    expect(proximoEnvio({ recorrencia: "diaria", hora: "06:00" }, new Date())?.toISOString()).toBe("2026-11-24T09:00:00.000Z");
    vi.setSystemTime(utc("2026-11-24T09:02:00Z")); // 06:02
    expect(proximoEnvio({ recorrencia: "diaria", hora: "06:00" }, new Date())?.toISOString()).toBe("2026-11-25T09:00:00.000Z");
  });
  it("vira o dia em Belém, não em UTC", () => {
    vi.useFakeTimers({ now: utc("2026-11-25T01:30:00Z") }); // 24/11 22:30 em Belém
    expect(proximoEnvio({ recorrencia: "diaria", hora: "23:00" }, new Date())?.toISOString()).toBe("2026-11-25T02:00:00.000Z");
  });
  it("semanal: próximo dia marcado", () => {
    vi.useFakeTimers({ now: utc("2026-11-24T12:00:00Z") }); // terça 09:00
    // domingo (0) às 08:00 → 29/11
    expect(proximoEnvio({ recorrencia: "semanal", hora: "08:00", diasSemana: [0] }, new Date())?.toISOString()).toBe("2026-11-29T11:00:00.000Z");
    // terça (2) às 08:00 já passou → terça seguinte
    expect(proximoEnvio({ recorrencia: "semanal", hora: "08:00", diasSemana: [2] }, new Date())?.toISOString()).toBe("2026-12-01T11:00:00.000Z");
    expect(proximoEnvio({ recorrencia: "semanal", hora: "08:00", diasSemana: [] }, new Date())).toBeNull();
  });
  it("uma vez: só no futuro", () => {
    vi.useFakeTimers({ now: utc("2026-11-24T12:00:00Z") });
    expect(proximoEnvio({ recorrencia: "uma_vez", data: "2026-11-30", hora: "19:00" }, new Date())?.toISOString()).toBe("2026-11-30T22:00:00.000Z");
    expect(proximoEnvio({ recorrencia: "uma_vez", data: "2026-11-20", hora: "19:00" }, new Date())).toBeNull();
  });
});

describe("textos", () => {
  it("descreve a agenda", () => {
    expect(descreverAgenda({ recorrencia: "diaria", hora: "06:00:00" })).toBe("Todos os dias às 06:00");
    expect(descreverAgenda({ recorrencia: "semanal", hora: "19:30", diasSemana: [5, 1, 3] })).toBe("Seg, Qua e Sex às 19:30");
    expect(descreverAgenda({ recorrencia: "semanal", hora: "08:00", diasSemana: [0] })).toBe("Todo domingo às 08:00");
    expect(descreverAgenda({ recorrencia: "semanal", hora: "07:00", diasSemana: [1, 2, 3, 4, 5] })).toBe("De segunda a sexta às 07:00");
  });
  it("personaliza", () => {
    expect(personalizar("Bom dia, {nome}! Hoje: {leitura}. 🔥 {sequencia}", { nome: "Ana Clara", leitura: "Jó 14 a 16", sequencia: 6 }))
      .toBe("Bom dia, Ana! Hoje: Jó 14 a 16. 🔥 6");
  });
});
