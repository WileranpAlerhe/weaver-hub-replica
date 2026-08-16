/* Captura os dados do lead e salva no servidor (sem localStorage). */
(function () {
  var ENDPOINT = '/api/public/lead';
  var last = '';

  function cookie(n) {
    var m = document.cookie.match('(^|;)\\s*' + n + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m.pop()) : '';
  }
  function fbc() {
    var c = cookie('_fbc');
    if (c) return c;
    var q = new URLSearchParams(location.search).get('fbclid');
    return q ? 'fb.1.' + Date.now() + '.' + q : '';
  }
  function digits(v) { return (v || '').replace(/\D/g, ''); }

  var TRACK_KEYS = ['src','sck','utm_source','utm_campaign','utm_medium','utm_content','utm_term'];
  function tracking() {
    var store = {};
    try { store = JSON.parse(localStorage.getItem('utmify_tracking') || '{}') || {}; } catch (_) { store = {}; }
    var qs = new URLSearchParams(location.search);
    var changed = false;
    TRACK_KEYS.forEach(function (k) {
      var v = qs.get(k);
      if (v && v !== store[k]) { store[k] = v.slice(0, 300); changed = true; }
    });
    if (changed) { try { localStorage.setItem('utmify_tracking', JSON.stringify(store)); } catch (_) {} }
    return store;
  }
  window.getTrackingParams = tracking;
  window.getUtmifyTracking = tracking; // alias historico (mesma leitura de UTMs/src/sck)


  function collect() {
    var data = { event_source_url: location.href, fbp: cookie('_fbp'), fbc: fbc() };
    var tk = tracking();
    TRACK_KEYS.forEach(function (k) { if (tk[k]) data[k] = tk[k]; });
    var qs = new URLSearchParams(location.search);
    ['name', 'nome'].forEach(function (k) { if (qs.get(k)) data.name = qs.get(k); });
    if (qs.get('email')) data.email = qs.get('email');
    if (qs.get('document') || qs.get('cpf')) data.cpf = qs.get('document') || qs.get('cpf');
    if (qs.get('telephone') || qs.get('phone')) data.phone = qs.get('telephone') || qs.get('phone');

    var inputs = document.querySelectorAll('input, textarea');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      var key = ((el.id || '') + ' ' + (el.name || '') + ' ' + (el.placeholder || '') + ' ' + (el.type || '')).toLowerCase();
      var v = (el.value || '').trim();
      if (!v) continue;
      if (/cpf|document/.test(key) && digits(v).length === 11) data.cpf = digits(v);
      else if (/mail/.test(key) && v.indexOf('@') > 0) data.email = v;
      else if (/(tel|phone|celular|whats)/.test(key) && digits(v).length >= 10) data.phone = digits(v);
      else if (/(nome|name)/.test(key) && !/cart|mae|mãe|usu/.test(key) && v.length >= 3 && !/\d/.test(v)) data.name = v;
    }
    return data;
  }

  function send() {
    var data = collect();
    if (!data.name && !data.email && !data.cpf && !data.phone && !data.fbp && !data.fbc && !data.utm_source && !data.src) return;
    var sig = JSON.stringify(data);
    if (sig === last) return;
    last = sig;
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: sig,
      }).catch(function () {});
    } catch (_) {}
  }

  window.saveLeadData = send;

  function bind() {
    send();
    document.addEventListener('change', send, true);
    document.addEventListener('blur', send, true);
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t && (t.tagName === 'BUTTON' || t.tagName === 'A' || (t.closest && t.closest('button,a')))) {
        setTimeout(send, 0);
      }
    }, true);
    window.addEventListener('pagehide', send);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
