/* Meta Pixel / Conversions API (server-only).
   O access_token nunca sai deste módulo: não é retornado, logado nem exposto. */

import { buildUserData, sha256Hex } from "@/lib/meta-normalize";

const GRAPH_VERSION = "v23.0";

export interface FbSettings {
  ga4_id: string | null;
  pixel_id: string | null;
  access_token: string | null;
  test_event_code: string | null;
  admin_password_hash: string | null;
  webhook_token: string | null;
}

export async function sha256(input: string): Promise<string> {
  return sha256Hex(input);
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
  cpf?: string | null; // nunca enviado à Meta
  amount_cents?: number | null;
  fbp?: string | null;
  fbc?: string | null;
  client_ip?: string | null;
  user_agent?: string | null;
  event_source_url?: string | null;
}

export interface CapiResult {
  ok: boolean;
  error?: string;
  events_received?: number;
  fbtrace_id?: string;
}

function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production" || Boolean(process.env["VERCEL"]);
}

/** Envia um evento à Conversions API. Nunca lança; devolve resultado observável. */
export async function sendCapiEvent(opts: {
  eventName: "InitiateCheckout" | "Purchase";
  eventId: string;
  lead: LeadRow;
  valueCents: number;
  eventTime?: number;
}): Promise<CapiResult> {
  const s = await getSettings();
  if (!s?.pixel_id || !s?.access_token) return { ok: false, error: "pixel_nao_configurado" };

  const { lead } = opts;
  const user_data = await buildUserData({
    email: lead.email,
    phone: lead.phone,
    name: lead.name,
    country: "br",
    // identificador interno estável do lead (nunca o CPF)
    externalId: lead.external_ref,
    fbp: lead.fbp,
    fbc: lead.fbc,
    clientIp: lead.client_ip,
    userAgent: lead.user_agent,
  });

  const event: Record<string, unknown> = {
    event_name: opts.eventName,
    event_time: opts.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: opts.eventId,
    action_source: "website",
    user_data,
    custom_data: {
      currency: "BRL",
      value: Number((opts.valueCents / 100).toFixed(2)),
    },
  };
  if (lead.event_source_url) event["event_source_url"] = lead.event_source_url;

  const payload: Record<string, unknown> = { data: [event] };
  // test_event_code apenas fora de produção
  if (s.test_event_code && !isProduction()) payload["test_event_code"] = s.test_event_code;

  try {
    const r = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(s.pixel_id)}/events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.access_token}`,
        },
        body: JSON.stringify(payload),
      },
    );
    const body = (await r.json().catch(() => ({}))) as {
      events_received?: number;
      fbtrace_id?: string;
      error?: { message?: string; code?: number };
    };

    const result: CapiResult = { ok: r.ok && Number(body.events_received ?? 0) > 0 };
    if (typeof body.events_received === "number") result.events_received = body.events_received;
    if (body.fbtrace_id) result.fbtrace_id = body.fbtrace_id;
    if (!result.ok) result.error = body.error?.message ?? `meta_http_${r.status}`;

    // log seguro: sem token, CPF, e-mail, telefone ou hashes
    console.log("[capi]", {
      event_name: opts.eventName,
      event_id: opts.eventId,
      status: r.status,
      events_received: result.events_received ?? 0,
      fbtrace_id: result.fbtrace_id ?? null,
      error: result.error ?? null,
    });
    return result;
  } catch (e) {
    const msg = (e as Error).message;
    console.log("[capi]", {
      event_name: opts.eventName,
      event_id: opts.eventId,
      error: msg,
    });
    return { ok: false, error: msg };
  }
}

export function clientIpFrom(request: Request): string | undefined {
  const h = request.headers;
  const xf = h.get("cf-connecting-ip") ?? h.get("x-forwarded-for") ?? "";
  return xf.split(",")[0]?.trim() || undefined;
}
