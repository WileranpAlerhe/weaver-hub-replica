import { createFileRoute } from "@tanstack/react-router";
import { clientIpFrom, getAdmin } from "@/lib/fb.server";
import { trackingFrom } from "@/lib/tracking";

const COOKIE = "lead_sid";

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function cookieHeader(sid: string) {
  return `${COOKIE}=${sid}; Path=/; Max-Age=${60 * 60 * 24 * 60}; SameSite=Lax`;
}

function digits(v?: string | null) {
  return (v ?? "").replace(/\D/g, "");
}

function str(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

export const Route = createFileRoute("/api/public/lead")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const sid = readCookie(request, COOKIE);
        if (!sid) return Response.json({ ok: true, lead: null });
        const admin = await getAdmin();
        const { data } = await admin
          .from("leads")
          .select("name, email, phone, cpf")
          .eq("session_id", sid)
          .maybeSingle();
        return Response.json({ ok: true, lead: data ?? null });
      },
      POST: async ({ request }) => {
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 });
        }

        let sid = readCookie(request, COOKIE);
        const isNew = !sid;
        if (!sid) sid = crypto.randomUUID().replace(/-/g, "");

        const admin = await getAdmin();
        const { data: existing } = await admin
          .from("leads")
          .select("id, name, email, phone, cpf, fbp, fbc")
          .eq("session_id", sid)
          .maybeSingle();

        const cpf = digits(str(body["cpf"]));
        const phone = digits(str(body["phone"]));
        type LeadPatch = {
          session_id: string;
          name: string | null;
          email: string | null;
          phone: string | null;
          cpf: string | null;
          fbp: string | null;
          fbc: string | null;
          client_ip: string | null;
          user_agent: string | null;
          event_source_url: string | null;
          updated_at: string;
        };
        const patch: LeadPatch = {
          session_id: sid,
          name: str(body["name"]) ?? existing?.name ?? null,
          email: str(body["email"])?.toLowerCase() ?? existing?.email ?? null,
          phone: (phone.length >= 10 ? phone : null) ?? existing?.phone ?? null,
          cpf: (cpf.length === 11 ? cpf : null) ?? existing?.cpf ?? null,
          fbp: str(body["fbp"]) ?? existing?.fbp ?? null,
          fbc: str(body["fbc"], 400) ?? existing?.fbc ?? null,
          client_ip: clientIpFrom(request) ?? null,
          user_agent: request.headers.get("user-agent"),
          event_source_url: str(body["event_source_url"], 500),
          updated_at: new Date().toISOString(),
        };

        const track = trackingFrom(body);

        if (existing?.id) {
          await admin.from("leads").update({ ...patch, ...track }).eq("id", existing.id);
        } else {
          await admin.from("leads").insert({ ...patch, ...track });
        }

        const headers = new Headers({ "Content-Type": "application/json" });
        void isNew;
        headers.append("Set-Cookie", cookieHeader(sid));
        return new Response(JSON.stringify({ ok: true }), { headers });
      },
    },
  },
});
