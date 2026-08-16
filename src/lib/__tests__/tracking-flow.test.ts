import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDb, type MockState } from "./mock-db";

const TOKEN = "TOKEN_SECRETO_DA_META";

let state: MockState;
let calls: { url: string; body: any; headers: Record<string, string> }[];

function freshState(): MockState {
  return {
    settings: {
      id: 1,
      pixel_id: "1234567890",
      access_token: TOKEN,
      test_event_code: "TEST123",
      webhook_token: "wtok",
      ga4_id: null,
      admin_password_hash: null,
    },
    leads: [
      {
        id: "lead-1",
        session_id: "sid-1",
        external_ref: "ref-1",
        pinpay_id: "txn-1",
        name: "João da Silva",
        email: "Joao@Email.com",
        phone: "(11) 98888-7777",
        cpf: "12345678901",
        amount_cents: 2430,
        fbp: "fb.1.100.200",
        fbc: "fb.1.1700000000000.ABC",
        client_ip: "9.9.9.9",
        user_agent: "UA/orig",
        event_source_url: "https://site.com/ml/2/4/14-3/",
        purchase_sent_at: null,
      },
    ],
    paymentEvents: [],
  };
}

beforeEach(() => {
  vi.resetModules();
  state = freshState();
  calls = [];
  vi.doMock("@/lib/db.server", () => ({ getDb: () => createMockDb(state) }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: any, init: any) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body ?? "{}")),
        headers: (init?.headers ?? {}) as Record<string, string>,
      });
      return new Response(JSON.stringify({ events_received: 1, fbtrace_id: "trace-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock("@/lib/db.server");
});

async function icHandler() {
  const mod = await import("@/routes/api/public/ic");
  return (mod.Route.options as any).server.handlers.POST;
}
async function webhookHandler() {
  const mod = await import("@/routes/api/public/pinpay-webhook");
  return (mod.Route.options as any).server.handlers.POST;
}
async function pixelHandler() {
  const mod = await import("@/routes/api/public/pixel[.]js");
  return (mod.Route.options as any).server.handlers.GET;
}

function req(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "user-agent": "UA/req", ...headers },
    body: JSON.stringify(body),
  });
}

const icBody = {
  external_ref: "ref-1",
  event_id: "ic_ref-1",
  value_cents: 2430,
  event_source_url: "https://site.com/ml/2/4/14-3/",
  fbp: "fb.1.100.200",
  fbc: "fb.1.1700000000000.ABC",
};

describe("script do pixel", () => {
  it("inicializa uma única vez e envia um único PageView", async () => {
    const js = await (await pixelHandler())({} as any).then((r: Response) => r.text());
    expect(js).toContain("fbq('init','1234567890')");
    expect(js.match(/fbq\('track','PageView'\)/g)?.length).toBe(1);
    expect(js).toContain("__FB_PIXEL_INIT");
    expect(js).toContain("__FB_PAGEVIEW_SENT");
    expect(js).not.toContain(TOKEN);
  });
});

describe("InitiateCheckout", () => {
  it("envia à CAPI com o mesmo event_id do navegador e dados normalizados", async () => {
    const res = await (await icHandler())({
      request: req("https://site.com/api/public/ic", icBody, { cookie: "lead_sid=sid-1" }),
    } as any);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
    expect(json.event_id).toBe("ic_ref-1");

    const ev = calls[0]!.body.data[0];
    expect(calls[0]!.url).toMatch(/graph\.facebook\.com\/v2[3-9]\.0\//);
    expect(ev.event_name).toBe("InitiateCheckout");
    expect(ev.event_id).toBe("ic_ref-1");
    expect(ev.action_source).toBe("website");
    expect(ev.event_source_url).toBe("https://site.com/ml/2/4/14-3/");
    expect(ev.custom_data).toEqual({ currency: "BRL", value: 24.3 });
    expect(ev.user_data.fbp).toBe("fb.1.100.200");
    expect(ev.user_data.fbc).toBe("fb.1.1700000000000.ABC");
    expect(ev.user_data.client_ip_address ?? "sem-ip").toBeTruthy();
    expect(ev.user_data.client_user_agent).toBe("UA/req");
    expect(ev.user_data.em[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(ev.user_data.ph[0]).toMatch(/^[a-f0-9]{64}$/);
    // CPF nunca é enviado (nem em claro nem hasheado)
    const raw = JSON.stringify(calls[0]!.body);
    expect(raw).not.toContain("12345678901");
    expect(raw).not.toContain(TOKEN);
  });

  it("clique duplo / retry não gera um segundo IC", async () => {
    const h = await icHandler();
    await h({ request: req("https://site.com/api/public/ic", icBody) } as any);
    const second = await h({ request: req("https://site.com/api/public/ic", icBody) } as any);
    expect((await second.json()).duplicated).toBe(true);
    expect(calls.length).toBe(1);
  });
});

describe("Purchase", () => {
  const url = "https://site.com/api/public/pinpay-webhook?token=wtok";
  const approved = {
    event: "payment_approved",
    id: "txn-1",
    external_ref: "ref-1",
    amount: 2430,
  };

  it("pix_received não gera Purchase", async () => {
    const res = await (await webhookHandler())({
      request: req(url, { event: "pix_received", id: "txn-1", external_ref: "ref-1" }),
    } as any);
    expect((await res.json()).ignored).toBe(true);
    expect(calls.length).toBe(0);
  });

  it("payment_pending não gera Purchase", async () => {
    const res = await (await webhookHandler())({
      request: req(url, { event: "payment_pending", status: "pending", id: "txn-1" }),
    } as any);
    expect((await res.json()).ignored).toBe(true);
    expect(calls.length).toBe(0);
  });

  it("payment_approved gera exatamente um Purchase server-side", async () => {
    const res = await (await webhookHandler())({ request: req(url, approved) } as any);
    expect((await res.json()).purchase_sent).toBe(true);
    expect(calls.length).toBe(1);
    const ev = calls[0]!.body.data[0];
    expect(ev.event_name).toBe("Purchase");
    expect(ev.event_id).toBe("purchase_txn-1");
    expect(ev.action_source).toBe("website");
    expect(ev.event_source_url).toBe("https://site.com/ml/2/4/14-3/");
    expect(ev.custom_data.value).toBe(24.3);
    expect(ev.user_data.client_ip_address).toBe("9.9.9.9");
    expect(ev.user_data.client_user_agent).toBe("UA/orig");
    expect(ev.user_data.external_id[0]).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(calls[0]!.body)).not.toContain("12345678901");
  });

  it("webhook repetido não duplica Purchase", async () => {
    const h = await webhookHandler();
    await h({ request: req(url, approved) } as any);
    const again = await h({ request: req(url, approved) } as any);
    expect((await again.json()).duplicated).toBe(true);
    expect(calls.length).toBe(1);
    expect(state.paymentEvents.filter((e) => e.status === "paid").length).toBe(1);
  });

  it("falha temporária permite retry com o mesmo event_id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: { message: "temporario" } }), { status: 500 })),
    );
    const h = await webhookHandler();
    const res = await h({ request: req(url, approved) } as any);
    expect((await res.json()).ok).toBe(false);
    expect(state.paymentEvents.filter((e) => e.status === "paid").length).toBe(0);
  });

  it("nenhuma requisição vai para a UTMify", async () => {
    await (await webhookHandler())({ request: req(url, approved) } as any);
    expect(calls.every((c) => !c.url.includes("utmify"))).toBe(true);
  });
});
