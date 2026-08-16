/* Envio de vendas para a UTMify (server-only). */

const UTMIFY_URL = "https://api.utmify.com.br/api-credentials/orders";

export interface UtmifyLead {
  external_ref: string;
  pinpay_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  cpf?: string | null;
  client_ip?: string | null;
  amount_cents?: number | null;
  created_at?: string | null;
  src?: string | null;
  sck?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_medium?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}

/** Data UTC no formato exigido pela UTMify: YYYY-MM-DD HH:MM:SS */
export function utcStamp(input?: string | Date | null): string {
  const d = input ? new Date(input) : new Date();
  const v = Number.isNaN(d.getTime()) ? new Date() : d;
  return v.toISOString().slice(0, 19).replace("T", " ");
}

export function getUtmifyToken(): string | undefined {
  return process.env["UTMIFY_API_TOKEN"] || undefined;
}

export async function sendUtmifyOrder(opts: {
  lead: UtmifyLead;
  status: "paid" | "refunded";
  valueCents: number;
  orderId: string;
  approvedAt?: string | Date | null;
  refundedAt?: string | Date | null;
}): Promise<{ ok: boolean; error?: string }> {
  const token = getUtmifyToken();
  if (!token) return { ok: false, error: "UTMIFY_API_TOKEN não configurado" };

  const { lead, status, valueCents, orderId } = opts;
  const price = Math.max(0, Math.round(valueCents));

  const body = {
    orderId,
    platform: "PinPay",
    paymentMethod: "pix",
    status,
    createdAt: utcStamp(lead.created_at ?? null),
    approvedDate: utcStamp(opts.approvedAt ?? new Date()),
    refundedAt: status === "refunded" ? utcStamp(opts.refundedAt ?? new Date()) : null,
    customer: {
      name: lead.name || "Cliente",
      email: lead.email || "cliente@email.com",
      phone: lead.phone || null,
      document: lead.cpf || null,
      country: "BR",
      ip: lead.client_ip || null,
    },
    products: [
      {
        id: "produto-principal",
        name: "Pedido",
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: price,
      },
    ],
    trackingParameters: {
      src: lead.src ?? null,
      sck: lead.sck ?? null,
      utm_source: lead.utm_source ?? null,
      utm_campaign: lead.utm_campaign ?? null,
      utm_medium: lead.utm_medium ?? null,
      utm_content: lead.utm_content ?? null,
      utm_term: lead.utm_term ?? null,
    },
    commission: {
      totalPriceInCents: price,
      gatewayFeeInCents: 0,
      userCommissionInCents: price,
      currency: "BRL",
    },
    isTest: false,
  };

  try {
    const r = await fetch(UTMIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-token": token },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text();
      return { ok: false, error: `utmify_${r.status}: ${text.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
