import { createFileRoute } from "@tanstack/react-router";
import { getPinpayToken } from "@/lib/pinpay.server";

export const Route = createFileRoute("/api/pix/status/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = getPinpayToken();
        if (!token) {
          return Response.json({ error: "PINPAY_TOKEN não configurado" }, { status: 500 });
        }
        const id = encodeURIComponent(params.id);
        const r = await fetch(`https://api.usepinpay.com/functions/v1/api-v1/pix/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
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
        return Response.json(data);
      },
    },
  },
});
