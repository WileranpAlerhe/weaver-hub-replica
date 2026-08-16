import { createFileRoute } from "@tanstack/react-router";
import { getAdmin, getSettings, sendCapiEvent, type LeadRow } from "@/lib/fb.server";

const PAID = ["paid", "approved", "completed", "success", "confirmed", "pago", "aprovado"];
const REFUNDED = ["refunded", "refund", "chargeback", "reembolsado", "estornado"];

function deep(obj: unknown, keys: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const rec = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" || typeof v === "number") return String(v);
  }
  for (const v of Object.values(rec)) {
    if (v && typeof v === "object") {
      const found = deep(v, keys);
      if (found) return found;
    }
  }
  return undefined;
}

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function validSignature(secret: string, raw: string, header: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const given = header.replace(/^sha256=/i, "").trim().toLowerCase();
  if (given.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/pinpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const raw = await request.text();

        // 1) Assinatura HMAC-SHA256 da PinPay (quando o secret está configurado)
        const webhookSecret = process.env["PINPAY_WEBHOOK_SECRET"];
        if (webhookSecret) {
          const header =
            request.headers.get("x-webhook-signature") ??
            request.headers.get("X-Webhook-Signature") ??
            "";
          if (!header || !(await validSignature(webhookSecret, raw, header))) {
            return new Response("Invalid signature", { status: 401 });
          }
        } else {
          // 2) Fallback: token na URL (comportamento atual do projeto)
          const token =
            url.searchParams.get("token") ?? request.headers.get("x-webhook-token") ?? "";
          const settings = await getSettings();
          if (!settings?.webhook_token) {
            return Response.json({ error: "webhook nao configurado" }, { status: 503 });
          }
          if (token !== settings.webhook_token) {
            return new Response("Invalid token", { status: 401 });
          }
        }

        let payload: unknown;
        try {
          payload = JSON.parse(raw);
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 });
        }

        const event = (deep(payload, ["event", "type", "event_type"]) ?? "").toLowerCase();
        const status = (deep(payload, ["status", "payment_status", "state"]) ?? "").toLowerCase();
        const pinpayId = deep(payload, ["id", "transaction_id", "transactionId", "payment_id"]);
        const externalRef = deep(payload, [
          "external_ref",
          "external_reference",
          "reference",
          "metadata_external_ref",
        ]);
        const amountRaw = deep(payload, ["amount", "value", "total"]);

        // pix_received acompanha payment_approved — ignorado para não duplicar a venda.
        if (event.includes("pix_received")) {
          return Response.json({ ok: true, ignored: true, event });
        }

        const isRefund = event.includes("refund") || REFUNDED.includes(status);
        const isPaid =
          !isRefund && (event.includes("payment_approved") || PAID.includes(status));

        if (!isPaid && !isRefund) {
          return Response.json({ ok: true, ignored: true, event, status });
        }

        const admin = await getAdmin();
        type Lead = LeadRow &
          UtmifyLead & {
            id: string;
            purchase_sent_at: string | null;
            amount_cents: number;
            pinpay_id?: string | null;
            utmify_paid_sent_at?: string | null;
            utmify_refunded_sent_at?: string | null;
          };
        let lead: Lead | null = null;
        if (externalRef) {
          const { data } = await admin
            .from("leads")
            .select("*")
            .eq("external_ref", externalRef)
            .maybeSingle();
          lead = (data as Lead | null) ?? null;
        }
        if (!lead && pinpayId) {
          const { data } = await admin
            .from("leads")
            .select("*")
            .eq("pinpay_id", pinpayId)
            .maybeSingle();
          lead = (data as Lead | null) ?? null;
        }

        if (!lead) {
          lead = {
            id: "",
            external_ref: externalRef ?? pinpayId ?? crypto.randomUUID(),
            name: deep(payload, ["name", "customer_name"]) ?? null,
            email: deep(payload, ["email"]) ?? null,
            phone: deep(payload, ["phone", "telephone"]) ?? null,
            cpf: deep(payload, ["document", "cpf", "number"]) ?? null,
            amount_cents: Number(amountRaw ?? 0),
            purchase_sent_at: null,
          } as Lead;
        }

        const row = lead;
        const valueCents = Number(row.amount_cents || amountRaw || 0);
        // transaction_id da PinPay é o identificador estável do pedido.
        const orderId = pinpayId ?? row.pinpay_id ?? row.external_ref;
        const now = new Date().toISOString();

        /** Reserva atômica: só o primeiro webhook consegue inserir (UNIQUE txn+status). */
        async function claim(status: "paid" | "refunded"): Promise<boolean> {
          const { error } = await admin
            .from("payment_events")
            .insert({ transaction_id: orderId, status });
          return !error;
        }

        // ---------- Reembolso ----------
        if (isRefund) {
          if (!(await claim("refunded"))) {
            return Response.json({ ok: true, duplicated: true, status: "refunded" });
          }
          const utm = await sendUtmifyOrder({
            lead: row,
            status: "refunded",
            valueCents,
            orderId,
          });
          if (row.id) {
            await admin
              .from("leads")
              .update({
                status: "refunded",
                utmify_status: utm.ok ? "refunded" : "refund_error",
                utmify_refunded_sent_at: utm.ok ? now : null,
                updated_at: now,
              })
              .eq("id", row.id);
          }
          if (!utm.ok) {
            // libera a reserva para permitir nova tentativa em um webhook posterior
            await admin
              .from("payment_events")
              .delete()
              .eq("transaction_id", orderId)
              .eq("status", "refunded");
          }
          return Response.json({ ok: utm.ok, utmify: utm.ok, error: utm.error ?? null });
        }

        // ---------- Pagamento aprovado ----------
        // Purchase para a Meta é enviado exclusivamente pela UTMify.
        if (!(await claim("paid"))) {
          return Response.json({ ok: true, duplicated: true, status: "paid" });
        }

        const utm = await sendUtmifyOrder({
          lead: row,
          status: "paid",
          valueCents,
          orderId,
        });

        if (row.id) {
          await admin
            .from("leads")
            .update({
              status: "paid",
              pinpay_id: pinpayId ?? row.pinpay_id ?? null,
              utmify_status: utm.ok ? "paid" : "paid_error",
              utmify_paid_sent_at: utm.ok ? now : null,
              updated_at: now,
            })
            .eq("id", row.id);
        }

        if (!utm.ok) {
          await admin
            .from("payment_events")
            .delete()
            .eq("transaction_id", orderId)
            .eq("status", "paid");
        }

        return Response.json({ ok: utm.ok, utmify: utm.ok, error: utm.error ?? null });
      },
      GET: async () => Response.json({ ok: true, info: "PinPay webhook endpoint" }),
    },
  },
});
