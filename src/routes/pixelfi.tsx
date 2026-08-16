import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/pixelfi")({
  head: () => ({
    meta: [
      { title: "Configuração do Pixel do Facebook" },
      { name: "description", content: "Painel para configurar o Pixel do Facebook, a API de Conversões e o webhook de pagamentos." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Configuração do Pixel do Facebook" },
      { property: "og:description", content: "Painel para configurar o Pixel do Facebook, a API de Conversões e o webhook de pagamentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PixelFi,
});

interface Cfg {
  configured: boolean;
  has_password: boolean;
  pixel_id: string | null;
  access_token_masked: string | null;
  test_event_code: string | null;
  webhook_token: string | null;
  ga4_id: string | null;
}

interface LeadRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  amount_cents: number;
  status: string;
  purchase_sent_at: string | null;
  created_at: string;
}

function PixelFi() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [pixelId, setPixelId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [testCode, setTestCode] = useState("");
  const [ga4Id, setGa4Id] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [origin, setOrigin] = useState("");
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/pixelfi/config")
      .then((r) => r.json())
      .then((d: Cfg) => {
        setCfg(d);
        setPixelId(d.pixel_id ?? "");
        setTestCode(d.test_event_code ?? "");
        setGa4Id(d.ga4_id ?? "");
      })
      .catch(() => setMsg({ type: "err", text: "Não foi possível carregar a configuração." }));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/pixelfi/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          pixel_id: pixelId,
          access_token: accessToken,
          test_event_code: testCode,
          ga4_id: ga4Id,
        }),
      });
      const d = (await r.json()) as { error?: string; webhook_token?: string; pixel_id?: string };
      if (!r.ok) throw new Error(d.error ?? "Falha ao salvar");
      setAccessToken("");
      setMsg({ type: "ok", text: "Configuração salva. O pixel já está ativo no site." });
      const fresh = (await (await fetch("/api/pixelfi/config")).json()) as Cfg;
      setCfg(fresh);
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function loadLeads() {
    setLoadingLeads(true);
    setMsg(null);
    try {
      const r = await fetch("/api/pixelfi/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = (await r.json()) as { error?: string; leads?: LeadRow[] };
      if (!r.ok) throw new Error(d.error ?? "Falha ao carregar");
      setLeads(d.leads ?? []);
    } catch (err) {
      setMsg({ type: "err", text: (err as Error).message });
    } finally {
      setLoadingLeads(false);
    }
  }

  const webhookUrl = cfg?.webhook_token
    ? `${origin}/api/public/pinpay-webhook?token=${cfg.webhook_token}`
    : null;

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Pixel do Facebook</h1>
          <p className="text-sm text-muted-foreground">
            Configure o Pixel e a API de Conversões. O InitiateCheckout dispara ao gerar o PIX e o
            Purchase é enviado pelo webhook da PinPay — sem o cliente precisar voltar ao site.
          </p>
        </header>

        <form onSubmit={save} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="pixel">Pixel ID</label>
            <input
              id="pixel"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder="1234567890"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="token">
              Token da API de Conversões {cfg?.access_token_masked ? `(atual: ${cfg.access_token_masked})` : ""}
            </label>
            <input
              id="token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={cfg?.access_token_masked ? "deixe em branco para manter" : "EAAG..."}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="test">Código de teste (opcional)</label>
            <input
              id="test"
              value={testCode}
              onChange={(e) => setTestCode(e.target.value)}
              placeholder="TEST12345"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="ga4">
              Google Analytics 4 (opcional)
            </label>
            <input
              id="ga4"
              value={ga4Id}
              onChange={(e) => setGa4Id(e.target.value)}
              placeholder="G-XXXXXXXXXX"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              ID de medição do GA4 — usado só para acompanhar acessos. Deixe em branco para desativar.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="pass">
              {cfg?.has_password ? "Senha do painel" : "Crie uma senha para este painel"}
            </label>
            <input
              id="pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 6 caracteres"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar configuração"}
          </button>

          {msg && (
            <p className={msg.type === "ok" ? "text-sm text-green-600" : "text-sm text-destructive"}>{msg.text}</p>
          )}
        </form>

        <section className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Webhook da PinPay</h2>
          {webhookUrl ? (
            <>
              <p className="text-sm text-muted-foreground">
                Cole esta URL no painel da PinPay (evento de pagamento aprovado). Ela envia o
                Purchase para o Facebook automaticamente.
              </p>
              <code className="block break-all rounded-md bg-muted p-3 text-xs text-foreground">{webhookUrl}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground"
              >
                Copiar URL
              </button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Salve a configuração para gerar a URL do webhook.</p>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Leads salvos</h2>
            <button
              type="button"
              onClick={loadLeads}
              disabled={loadingLeads || password.length < 6}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
            >
              {loadingLeads ? "Carregando..." : "Carregar"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Os dados do lead ficam gravados no banco (não no navegador). Informe a senha acima e clique em Carregar.
          </p>
          {leads && leads.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum lead capturado ainda.</p>
          )}
          {leads && leads.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">Nome</th>
                    <th className="py-1 pr-3">Contato</th>
                    <th className="py-1 pr-3">CPF</th>
                    <th className="py-1 pr-3">Valor</th>
                    <th className="py-1 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  {leads.map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="py-1.5 pr-3">{l.name ?? "—"}</td>
                      <td className="py-1.5 pr-3">
                        {l.email ?? "—"}
                        <br />
                        {l.phone ?? ""}
                      </td>
                      <td className="py-1.5 pr-3">{l.cpf ?? "—"}</td>
                      <td className="py-1.5 pr-3">
                        {l.amount_cents ? `R$ ${(l.amount_cents / 100).toFixed(2)}` : "—"}
                      </td>
                      <td className="py-1.5 pr-3">
                        {l.status}
                        {l.purchase_sent_at ? " • Purchase enviado" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-foreground">Status</h2>
          <p>Pixel: {cfg?.configured ? `ativo (${cfg.pixel_id})` : "não configurado"}</p>
          <p>Eventos: PageView e InitiateCheckout (navegador + servidor), Purchase (webhook/servidor).</p>
          <p>Google Analytics: {cfg?.ga4_id ? `ativo (${cfg.ga4_id})` : "não configurado"}</p>
        </section>
      </div>
    </main>
  );
}
