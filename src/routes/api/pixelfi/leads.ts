import { createFileRoute } from "@tanstack/react-router";
import { getAdmin, getSettings, sha256 } from "@/lib/fb.server";

export const Route = createFileRoute("/api/pixelfi/leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { password?: string };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 });
        }
        const settings = await getSettings();
        if (!settings?.admin_password_hash) {
          return Response.json({ error: "Defina a senha do painel primeiro." }, { status: 403 });
        }
        const hash = await sha256((body.password ?? "").trim());
        if (hash !== settings.admin_password_hash) {
          return Response.json({ error: "Senha incorreta." }, { status: 401 });
        }

        const admin = await getAdmin();
        const { data, error } = await admin
          .from("leads")
          .select(
            "id, name, email, phone, cpf, amount_cents, status, purchase_sent_at, checkout_event_id, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true, leads: data ?? [] });
      },
    },
  },
});
