import { createFileRoute } from "@tanstack/react-router";
import { getSettings } from "@/lib/fb.server";

export const Route = createFileRoute("/api/public/pixel.js")({
  server: {
    handlers: {
      GET: async () => {
        const s = await getSettings();
        const pixelId = s?.pixel_id ?? "";
        const ga4Id = (s?.ga4_id ?? "").replace(/[^A-Za-z0-9-]/g, "");
        const ga4 = ga4Id
          ? `
(function(){var t=document.createElement('script');t.async=!0;
t.src='https://www.googletagmanager.com/gtag/js?id=${ga4Id}';
var f=document.getElementsByTagName('script')[0];f.parentNode.insertBefore(t,f);})();
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4Id}');
window.__GA4_ID='${ga4Id}';`
          : `window.__GA4_ID='';`;
        // Marcacao do Facebook Pixel PAUSADA a pedido: rastreamento via UTMify.
        // O pixel_id continua salvo no banco; basta reativar este bloco depois.
        const js = `/* Facebook Pixel pausado (rastreamento via UTMify) */
window.__FB_PIXEL_ID='';
window.__FB_PIXEL_PAUSED=true;
window.__FB_PIXEL_ID_SAVED='${pixelId}';`;

        return new Response(js + "\n" + ga4, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=60",
          },
        });
      },
    },
  },
});
