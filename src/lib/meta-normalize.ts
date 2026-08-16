/* Normalização e hashing dos dados de correspondência avançada da Meta.
   Módulo puro (sem segredos) para poder ser testado isoladamente. */

export function sha256Hex(input: string): Promise<string> {
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(input))
    .then((buf) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );
}

const stripAccents = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function normEmail(v?: string | null): string | undefined {
  const s = (v ?? "").trim().toLowerCase();
  return s.includes("@") ? s : undefined;
}

/** Telefone somente dígitos, com código do país (55) quando o número é local. */
export function normPhone(v?: string | null): string | undefined {
  let d = (v ?? "").replace(/\D/g, "");
  if (!d) return undefined;
  if (d.length >= 10 && d.length <= 11) d = "55" + d;
  return d.length >= 11 ? d : undefined;
}

export function normName(v?: string | null): string | undefined {
  const s = stripAccents((v ?? "").trim().toLowerCase()).replace(/\s+/g, " ").trim();
  return s || undefined;
}

export function splitName(name?: string | null): { fn?: string; ln?: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return {};
  const out: { fn?: string; ln?: string } = {};
  const fn = normName(parts[0]);
  if (fn) out.fn = fn;
  if (parts.length > 1) {
    const ln = normName(parts[parts.length - 1]);
    if (ln) out.ln = ln;
  }
  return out;
}

export function normCity(v?: string | null): string | undefined {
  const s = normName(v)?.replace(/\s/g, "");
  return s || undefined;
}

export function normState(v?: string | null): string | undefined {
  const s = (v ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
  return s || undefined;
}

export function normZip(v?: string | null): string | undefined {
  const s = (v ?? "").replace(/\D/g, "");
  return s || undefined;
}

export function normCountry(v?: string | null): string | undefined {
  const s = (v ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");
  return s.length === 2 ? s : undefined;
}

export function normExternalId(v?: string | null): string | undefined {
  const s = (v ?? "").trim();
  return s || undefined;
}

/** Constrói o _fbc oficial da Meta a partir do fbclid, mantendo o timestamp da captura. */
export function buildFbc(fbclid?: string | null, capturedAtMs?: number): string | undefined {
  const id = (fbclid ?? "").trim();
  if (!id) return undefined;
  return `fb.1.${Math.floor(capturedAtMs ?? Date.now())}.${id}`;
}

export interface MatchInput {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  externalId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}

/** user_data pronto para a CAPI: hash SHA-256 uma única vez nos campos exigidos. */
export async function buildUserData(input: MatchInput): Promise<Record<string, unknown>> {
  const { fn, ln } = splitName(input.name);
  const hashed: Array<[string, string | undefined]> = [
    ["em", normEmail(input.email)],
    ["ph", normPhone(input.phone)],
    ["fn", fn],
    ["ln", ln],
    ["ct", normCity(input.city)],
    ["st", normState(input.state)],
    ["zp", normZip(input.zip)],
    ["country", normCountry(input.country)],
    ["external_id", normExternalId(input.externalId)],
  ];

  const out: Record<string, unknown> = {};
  for (const [key, value] of hashed) {
    if (!value) continue;
    out[key] = [await sha256Hex(value)];
  }
  if (input.fbp) out["fbp"] = input.fbp;
  if (input.fbc) out["fbc"] = input.fbc;
  if (input.clientIp) out["client_ip_address"] = input.clientIp;
  if (input.userAgent) out["client_user_agent"] = input.userAgent;
  return out;
}
