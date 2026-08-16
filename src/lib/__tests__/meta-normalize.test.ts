import { describe, expect, it } from "vitest";
import {
  buildFbc,
  buildUserData,
  normEmail,
  normName,
  normPhone,
  sha256Hex,
} from "@/lib/meta-normalize";

describe("normalização", () => {
  it("e-mail: trim + lowercase", () => {
    expect(normEmail("  Joao@Email.COM ")).toBe("joao@email.com");
  });
  it("telefone: dígitos + código do país", () => {
    expect(normPhone("(11) 98888-7777")).toBe("5511988887777");
    expect(normPhone("5511988887777")).toBe("5511988887777");
    expect(normPhone("123")).toBeUndefined();
  });
  it("nome: sem acento, lowercase, espaços colapsados", () => {
    expect(normName("  JOÃO   DA Silva ")).toBe("joao da silva");
  });
  it("_fbc é construído no formato oficial com o timestamp da captura", () => {
    expect(buildFbc("ABC123", 1700000000000)).toBe("fb.1.1700000000000.ABC123");
    expect(buildFbc("")).toBeUndefined();
  });
});

describe("user_data da CAPI", () => {
  it("aplica SHA-256 uma única vez e não hasheia fbp/fbc/ip/ua", async () => {
    const ud = await buildUserData({
      email: " Joao@Email.com ",
      phone: "(11) 98888-7777",
      name: "João da Silva",
      country: "BR",
      externalId: "ref-123",
      fbp: "fb.1.1.2",
      fbc: "fb.1.1700000000000.ABC",
      clientIp: "1.2.3.4",
      userAgent: "UA/1.0",
    });
    expect(ud["em"]).toEqual([await sha256Hex("joao@email.com")]);
    expect(ud["ph"]).toEqual([await sha256Hex("5511988887777")]);
    expect(ud["fn"]).toEqual([await sha256Hex("joao")]);
    expect(ud["ln"]).toEqual([await sha256Hex("silva")]);
    expect(ud["external_id"]).toEqual([await sha256Hex("ref-123")]);
    expect(ud["fbp"]).toBe("fb.1.1.2");
    expect(ud["fbc"]).toBe("fb.1.1700000000000.ABC");
    expect(ud["client_ip_address"]).toBe("1.2.3.4");
    expect(ud["client_user_agent"]).toBe("UA/1.0");
  });

  it("não envia campos vazios ou fictícios", async () => {
    const ud = await buildUserData({ externalId: "ref-1" });
    expect(Object.keys(ud)).toEqual(["external_id"]);
  });

  it("cidade/estado/CEP só quando reais", async () => {
    const ud = await buildUserData({ city: "São Paulo", state: "SP", zip: "01001-000" });
    expect(ud["ct"]).toEqual([await sha256Hex("saopaulo")]);
    expect(ud["st"]).toEqual([await sha256Hex("sp")]);
    expect(ud["zp"]).toEqual([await sha256Hex("01001000")]);
  });
});
