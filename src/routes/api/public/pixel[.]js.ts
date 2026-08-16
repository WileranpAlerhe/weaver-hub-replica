import { createFileRoute } from "@tanstack/react-router";
import { getSettings } from "@/lib/fb.server";

export const Route = createFileRoute("/api/public/pixel.js")({
  server: {
    handlers: {
      GET: async () => {
        const s = await getSettings();
        const pixelId = (s?.pixel_id ?? "").replace(/\D/g, "");
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

        /* Meta Pixel: uma unica instalacao e um unico PageView por documento. */
        const js = pixelId
          ? `window.__FB_PIXEL_ID='${pixelId}';
(function(){
  if (window.__FB_PIXEL_INIT) return;
  window.__FB_PIXEL_INIT=true;
  if (!window.fbq) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.id='fb-pixel-script';t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  }
  try { window.fbq('init','${pixelId}'); } catch(_) {}
  if (!window.__FB_PAGEVIEW_SENT) {
    window.__FB_PAGEVIEW_SENT=true;
    try { window.fbq('track','PageView'); } catch(_) {}
  }
})();`
          : `window.__FB_PIXEL_ID='';`;

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
