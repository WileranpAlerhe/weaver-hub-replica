import { createFileRoute } from "@tanstack/react-router";
import { clientIpFrom, getAdmin, sendCapiEvent, type LeadRow } from "@/lib/fb.server";
import { buildFbc } from "@/lib/meta-normalize";

interface Body {
  external_ref?: string;
  event_id?: string;
  value_cents?: number;
  event_source_url?: string;
  fbp?: string;
  fbc?: string;
  fbclid?: string;
}

function str(v: unknown, max = 300): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

export const Route = createFileRoute("/api/public/ic")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 });
        }

        const externalRef = str(body.external_ref, 80);
        if (!externalRef) return Response.json({ error: "external_ref obrigatório" }, { status: 400 });
        const eventId = str(body.event_id, 120) ?? `ic_${externalRef}`;
        if (eventId !== `ic_${externalRef}`) {
          return Response.json({ error: "event_id inválido" }, { status: 400 });
        }
        const valueCents = Number(body.value_cents ?? 0);
        if (!Number.isInteger(valueCents) || valueCents < 100) {
          return Response.json({ error: "value_cents inválido" }, { status: 400 });
        }

        const admin = await getAdmin();

        // Trava de deduplicacao: um unico IC server-side por event_id (retry seguro em falha).
        const { error: claimError } = await admin
          .from("payment_events")
          .insert({ transaction_id: eventId, status: "ic_sent" });
        if (claimError) {
          return Response.json({ ok: true, duplicated: true, event_id: eventId });
        }

        // Dados reais do lead da sessao (nunca inventados).
        const cookies = request.headers.get("cookie") ?? "";
        const sid = cookies.match(/(?:^|;\s*)lead_sid=([^;]+)/)?.[1];
        let row: { name?: string | null; email?: string | null; phone?: string | null } = {};
        if (sid) {
          const { data } = await admin
            .from("leads")
            .select("name, email, phone")
            .eq("session_id", decodeURIComponent(sid))
            .maybeSingle();
          if (data) row = data;
        }

        const fbc = str(body.fbc, 400) ?? buildFbc(str(body.fbclid, 300)) ?? null;
        const lead: LeadRow = {
          external_ref: externalRef,
          name: row.name ?? null,
          email: row.email ?? null,
          phone: row.phone ?? null,
          fbp: str(body.fbp, 200),
          fbc,
          client_ip: clientIpFrom(request) ?? null,
          user_agent: request.headers.get("user-agent"),
          event_source_url: str(body.event_source_url, 500),
        };

        const res = await sendCapiEvent({
          eventName: "InitiateCheckout",
          eventId,
          lead,
          valueCents,
        });

        if (!res.ok) {
          // libera a trava para permitir retry com o MESMO event_id
          await admin
            .from("payment_events")
            .delete()
            .eq("transaction_id", eventId)
            .eq("status", "ic_sent");
        }

        return Response.json({
          ok: res.ok,
          event_id: eventId,
          events_received: res.events_received ?? 0,
          error: res.error ?? null,
        });
      },
    },
  },
});
