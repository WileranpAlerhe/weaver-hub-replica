import { createFileRoute } from "@tanstack/react-router";
import { getAdmin, getSettings, sha256 } from "@/lib/fb.server";

function mask(v?: string | null) {
  if (!v) return null;
  return v.length <= 8 ? "••••" : v.slice(0, 4) + "••••" + v.slice(-4);
}

export const Route = createFileRoute("/api/pixelfi/config")({
  server: {
    handlers: {
      GET: async () => {
        const s = await getSettings();
        return Response.json({
          configured: Boolean(s?.pixel_id && s?.access_token),
          has_password: Boolean(s?.admin_password_hash),
          pixel_id: s?.pixel_id ?? null,
          access_token_masked: mask(s?.access_token),
          test_event_code: s?.test_event_code ?? null,
          webhook_token: s?.webhook_token ?? null,
          ga4_id: s?.ga4_id ?? null,
        });
      },
      POST: async ({ request }) => {
        let body: {
          password?: string;
          new_password?: string;
          pixel_id?: string;
          access_token?: string;
          test_event_code?: string;
          ga4_id?: string;
        };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "JSON inválido" }, { status: 400 });
        }

        const current = await getSettings();
        const password = (body.password ?? "").trim();
        if (password.length < 6) {
          return Response.json({ error: "Senha deve ter ao menos 6 caracteres." }, { status: 400 });
        }
        const hash = await sha256(password);
        if (current?.admin_password_hash && current.admin_password_hash !== hash) {
          return Response.json({ error: "Senha incorreta." }, { status: 401 });
        }

        const pixelId = (body.pixel_id ?? "").replace(/\D/g, "");
        const token = (body.access_token ?? "").trim();
        if (!pixelId) return Response.json({ error: "Pixel ID inválido." }, { status: 400 });
        if (!token && !current?.access_token) {
          return Response.json({ error: "Informe o token da API de Conversões." }, { status: 400 });
        }

        const newHash = body.new_password && body.new_password.trim().length >= 6
          ? await sha256(body.new_password.trim())
          : hash;

        const admin = await getAdmin();
        const { error } = await admin.from("fb_settings").upsert({
          id: 1,
          pixel_id: pixelId,
          access_token: token || current?.access_token || null,
          test_event_code: (body.test_event_code ?? "").trim() || null,
          ga4_id: (body.ga4_id ?? "").trim().toUpperCase() || null,
          admin_password_hash: newHash,
          webhook_token: current?.webhook_token ?? crypto.randomUUID().replace(/-/g, ""),
          updated_at: new Date().toISOString(),
        });
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const s = await getSettings();
        return Response.json({
          ok: true,
          pixel_id: s?.pixel_id ?? null,
          webhook_token: s?.webhook_token ?? null,
          test_event_code: s?.test_event_code ?? null,
          ga4_id: s?.ga4_id ?? null,
        });
      },
    },
  },
});
