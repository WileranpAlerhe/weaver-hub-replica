import { createFileRoute } from "@tanstack/react-router";
import { clientIpFrom, getAdmin, sendCapiEvent } from "@/lib/fb.server";
import { getPinpayToken } from "@/lib/pinpay.server";
import { trackingFrom } from "@/lib/tracking";

const PINPAY_URL = "https://api.usepinpay.com/functions/v1/api-v1/pix";

interface Body {
  amount: number; // cents
  description?: string;
  customer: {
    name: string;
    email?: string;
    document: string; // CPF digits
    phone?: string;
  };
  external_ref?: string;
  fbp?: string;
  fbc?: string;
  event_source_url?: string;
  event_id?: string;
}

export const Route = createFileRoute("/api/pix/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = getPinpayToken();
        if (!token) {
          return Response.json({ error: "PINPAY_TOKEN não configurado" }, { status: 500 });
        }
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 });
        }
        if (!Number.isInteger(body.amount) || body.amount < 100) {
          return Response.json({ error: "amount inválido (em centavos)" }, { status: 400 });
        }
        const doc = (body.customer?.document ?? "").replace(/\D/g, "");
        if (doc.length !== 11) {
          return Response.json({ error: "CPF inválido" }, { status: 400 });
        }
        const idem = body.external_ref || crypto.randomUUID();
        const payload = {
          amount: body.amount,
          description: body.description ?? "Pagamento",
          customer: {
            name: body.customer.name || "Cliente",
            email: body.customer.email || "cliente@email.com",
            document: { type: "CPF", number: doc },
            phone: (body.customer.phone ?? "").replace(/\D/g, "") || undefined,
          },
          expires_in: 3600,
          metadata: {
            external_ref: idem,
            external_reference: idem,
            checkout_url: body.event_source_url ?? new URL(request.url).origin,
          },
          external_ref: idem,
        };
        const r = await fetch(PINPAY_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idem,
          },
          body: JSON.stringify(payload),
        });
        const text = await r.text();
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }
        if (!r.ok) {
          return Response.json({ error: "pinpay_error", details: data }, { status: r.status });
        }

        const rec = (data ?? {}) as Record<string, unknown>;
        const pinpayId =
          (typeof rec["id"] === "string" && rec["id"]) ||
          (typeof rec["transaction_id"] === "string" && rec["transaction_id"]) ||
          null;

        const lead = {
          external_ref: idem,
          pinpay_id: pinpayId,
          name: body.customer.name ?? null,
          email: body.customer.email ?? null,
          phone: (body.customer.phone ?? "").replace(/\D/g, "") || null,
          cpf: doc,
          amount_cents: body.amount,
          status: "pending",
          fbp: body.fbp ?? null,
          fbc: body.fbc ?? null,
          client_ip: clientIpFrom(request) ?? null,
          user_agent: request.headers.get("user-agent"),
          event_source_url: body.event_source_url ?? null,
          checkout_event_id: body.event_id ?? "ic_" + idem,
          updated_at: new Date().toISOString(),
          ...trackingFrom(body as unknown as Record<string, unknown>),
        };

        try {
          const admin = await getAdmin();
          const cookies = request.headers.get("cookie") ?? "";
          const sidMatch = cookies.match(/(?:^|;\s*)lead_sid=([^;]+)/);
          const sid = sidMatch?.[1] ? decodeURIComponent(sidMatch[1]) : null;
          if (sid) {
            const { data: row } = await admin
              .from("leads")
              .select("id")
              .eq("session_id", sid)
              .maybeSingle();
            if (row?.id) {
              await admin.from("leads").update(lead).eq("id", row.id);
            } else {
              await admin.from("leads").insert({ ...lead, session_id: sid });
            }
          } else {
            await admin.from("leads").upsert(lead, { onConflict: "external_ref" });
          }
        } catch {
          // rastreamento nunca deve quebrar o pagamento
        }

        return Response.json({ ...rec, external_ref: idem, event_id: lead.checkout_event_id });
      },
    },
  },
});
