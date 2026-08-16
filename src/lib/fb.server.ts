/* Facebook Conversions API helpers (server-only) */

export interface FbSettings {
  ga4_id: string | null;
  pixel_id: string | null;
  access_token: string | null;
  test_event_code: string | null;
  admin_password_hash: string | null;
  webhook_token: string | null;
}

export async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashNorm(value?: string | null): Promise<string | undefined> {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (!v) return undefined;
  return sha256(v);
}

export async function getAdmin() {
  const { getDb } = await import("@/lib/db.server");
  return getDb();
}

export async function getSettings(): Promise<FbSettings | null> {
  const admin = await getAdmin();
  const { data } = await admin.from("fb_settings").select("*").eq("id", 1).maybeSingle();
  return (data as FbSettings | null) ?? null;
}

export interface LeadRow {
  external_ref: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  amount_cents?: number | null;
  fbp?: string | null;
  fbc?: string | null;
  client_ip?: string | null;
  user_agent?: string | null;
  event_source_url?: string | null;
}

function splitName(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return { fn: parts[0], ln: parts.length > 1 ? parts[parts.length - 1] : undefined };
}

function onlyDigits(v?: string | null) {
  return (v ?? "").replace(/\D/g, "");
}

/** Sends an event to the Meta Conversions API. Returns the API response (or an error object). */
export async function sendCapiEvent(opts: {
  eventName: "InitiateCheckout" | "Purchase";
  eventId: string;
  lead: LeadRow;
  valueCents: number;
  eventTime?: number;
}): Promise<{ ok: boolean; response?: unknown; error?: string }> {
  const s = await getSettings();
  if (!s?.pixel_id || !s?.access_token) return { ok: false, error: "pixel_nao_configurado" };

  const { lead } = opts;
  const { fn, ln } = splitName(lead.name);
  const phone = onlyDigits(lead.phone);

  const user_data: Record<string, unknown> = {
    em: [await hashNorm(lead.email)].filter(Boolean),
    ph: [await hashNorm(phone ? (phone.length <= 11 ? "55" + phone : phone) : undefined)].filter(Boolean),
    fn: [await hashNorm(fn)].filter(Boolean),
    ln: [await hashNorm(ln)].filter(Boolean),
    country: [await hashNorm("br")].filter(Boolean),
    external_id: [await hashNorm(onlyDigits(lead.cpf) || lead.external_ref)].filter(Boolean),
  };
  if (lead.fbp) user_data["fbp"] = lead.fbp;
  if (lead.fbc) user_data["fbc"] = lead.fbc;
  if (lead.client_ip) user_data["client_ip_address"] = lead.client_ip;
  if (lead.user_agent) user_data["client_user_agent"] = lead.user_agent;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: opts.eventName,
        event_time: opts.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: opts.eventId,
        action_source: "website",
        event_source_url: lead.event_source_url ?? undefined,
        user_data,
        custom_data: {
          currency: "BRL",
          value: Number((opts.valueCents / 100).toFixed(2)),
          content_type: "product",
        },
      },
    ],
  };
  if (s.test_event_code) payload["test_event_code"] = s.test_event_code;

  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/${encodeURIComponent(s.pixel_id)}/events?access_token=${encodeURIComponent(s.access_token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const body = (await r.json().catch(() => ({}))) as unknown;
    return r.ok ? { ok: true, response: body } : { ok: false, error: "meta_error", response: body };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function clientIpFrom(request: Request): string | undefined {
  const h = request.headers;
  const xf = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for") ?? "";
  return xf.split(",")[0]?.trim() || undefined;
}
