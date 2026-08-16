/* PinPay PIX Modal — cores nativas do site (#14315c) */
(function () {
  if (window.__PixModalLoaded) return;
  window.__PixModalLoaded = true;

  var CSS = `
  .pix-modal-overlay{position:fixed;inset:0;background:rgba(13,34,64,.75);backdrop-filter:blur(4px);display:none;align-items:flex-start;justify-content:center;z-index:99999;overflow-y:auto;padding:20px;font-family:'Sora',sans-serif;}
  .pix-modal-overlay.open{display:flex;}
  .pix-modal{background:#fff;border-radius:16px;max-width:460px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35);overflow:hidden;margin:auto;}
  .pix-modal-header{background:linear-gradient(135deg,#0d2240,#14315c);color:#fff;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;}
  .pix-modal-header h3{margin:0;font-size:16px;font-weight:700;}
  .pix-modal-close{background:transparent;border:0;color:#fff;font-size:24px;cursor:pointer;line-height:1;padding:0 4px;}
  .pix-modal-body{padding:20px;}
  .pix-field{margin-bottom:12px;}
  .pix-field label{display:block;font-size:12px;font-weight:600;color:#14315c;margin-bottom:6px;}
  .pix-field input{width:100%;padding:12px;border:1px solid #d5d8dd;border-radius:8px;font-size:14px;font-family:inherit;box-sizing:border-box;background:#fff;color:#0d2240;}
  .pix-field input:focus{outline:none;border-color:#14315c;box-shadow:0 0 0 3px rgba(20,49,92,.15);}
  .pix-amount-box{background:#f8f9fa;border-radius:8px;padding:14px;text-align:center;margin-bottom:16px;}
  .pix-amount-box .l{font-size:12px;color:#666;}
  .pix-amount-box .v{font-size:26px;font-weight:700;color:#14315c;}
  .pix-btn{background:#14315c;color:#fff;padding:14px;border:0;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;width:100%;font-family:inherit;transition:background .2s;}
  .pix-btn:hover{background:#0d2240;}
  .pix-btn:disabled{opacity:.6;cursor:not-allowed;}
  .pix-error{background:#ffe6e6;color:#dc3545;padding:10px;border-radius:6px;font-size:13px;margin-top:10px;}
  .pix-qr-wrap{text-align:center;padding:10px 0 4px;}
  .pix-qr-wrap img{width:220px;height:220px;border:1px solid #e5e7eb;border-radius:8px;padding:6px;background:#fff;}
  .pix-copy-box{background:#f8f9fa;border:1px dashed #14315c;border-radius:8px;padding:12px;margin-top:14px;font-size:11px;font-family:monospace;color:#0d2240;word-break:break-all;max-height:90px;overflow:auto;}
  .pix-status{display:flex;align-items:center;justify-content:center;gap:8px;background:#fff8e1;color:#a15c00;padding:10px;border-radius:8px;font-size:13px;font-weight:600;margin-top:14px;}
  .pix-status.paid{background:#e6f7ec;color:#0f7c3a;}
  .pix-spin{width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:pixspin .8s linear infinite;}
  @keyframes pixspin{to{transform:rotate(360deg);}}
  .pix-timer{text-align:center;color:#dc3545;font-weight:700;margin-top:10px;font-size:13px;}
  .pix-steps{background:#f8f9fa;border-radius:8px;padding:12px 14px;margin-top:14px;font-size:12px;color:#333;line-height:1.55;}
  .pix-steps b{color:#14315c;}
  `;
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  var overlay = document.createElement('div');
  overlay.className = 'pix-modal-overlay';
  overlay.innerHTML = `
    <div class="pix-modal" role="dialog" aria-modal="true" aria-label="Pagamento via PIX">
      <div class="pix-modal-header">
        <h3>Pagamento via PIX</h3>
        <button type="button" class="pix-modal-close" aria-label="Fechar">×</button>
      </div>
      <div class="pix-modal-body">
        <div class="pix-amount-box">
          <div class="l">Valor a pagar</div>
          <div class="v" data-pix-amount>R$ 0,00</div>
        </div>
        <div data-pix-loading style="display:none;text-align:center;padding:30px 10px;">
          <div class="pix-spin" style="width:36px;height:36px;border-width:4px;color:#14315c;margin:0 auto 14px;"></div>
          <div style="color:#14315c;font-weight:600;">Gerando seu PIX...</div>
        </div>
        <div data-pix-form>
          <div class="pix-field">
            <label>Nome completo</label>
            <input type="text" data-pix-name placeholder="Seu nome" autocomplete="name" />
          </div>
          <div class="pix-field">
            <label>CPF</label>
            <input type="text" data-pix-doc placeholder="000.000.000-00" inputmode="numeric" maxlength="14" />
          </div>
          <div class="pix-field">
            <label>E-mail</label>
            <input type="email" data-pix-email placeholder="voce@email.com" autocomplete="email" />
          </div>
          <div class="pix-field">
            <label>Telefone</label>
            <input type="tel" data-pix-phone placeholder="(11) 99999-9999" inputmode="numeric" maxlength="15" />
          </div>
          <button type="button" class="pix-btn" data-pix-generate>
            <i class="fas fa-qrcode" style="margin-right:6px;"></i>Gerar QR Code PIX
          </button>
          <div class="pix-error" style="display:none;" data-pix-error></div>
        </div>
        <div data-pix-result style="display:none;">
          <div class="pix-qr-wrap"><img data-pix-qrimg alt="QR Code PIX" /></div>
          <button type="button" class="pix-btn" data-pix-copy>
            <i class="fas fa-copy" style="margin-right:6px;"></i>Copiar código PIX
          </button>
          <div class="pix-copy-box" data-pix-code></div>
          <div class="pix-status" data-pix-status><span class="pix-spin"></span><span>Aguardando pagamento...</span></div>
          <div class="pix-timer" data-pix-timer></div>
          <div class="pix-steps">
            <b>Como pagar:</b><br>
            1. Abra o app do seu banco<br>
            2. Escolha pagar via <b>PIX</b> com QR Code ou Copia e Cola<br>
            3. Confirme o valor de <span data-pix-amount></span><br>
            4. O acesso é liberado automaticamente após a confirmação
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  var $ = function (s) { return overlay.querySelector(s); };
  var $$ = function (s) { return overlay.querySelectorAll(s); };
  var pollTimer = null, countdownTimer = null;

  function close() {
    overlay.classList.remove('open');
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  }
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  $('.pix-modal-close').addEventListener('click', close);


  function getCookie(n) {
    var m = document.cookie.match('(^|;)\\s*' + n + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m.pop()) : '';
  }
  function getFbc() {
    var c = getCookie('_fbc');
    if (c) return c;
    var q = new URLSearchParams(location.search).get('fbclid');
    if (q) return 'fb.1.' + Date.now() + '.' + q;
    try {
      var top = (window.top && window.top !== window) ? null : null;
    } catch (_) {}
    return '';
  }

  function fmt(v) { return 'R$ ' + (v / 100).toFixed(2).replace('.', ','); }

  function maskCPF(v) {
    v = v.replace(/\D/g, '').slice(0, 11);
    return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  function maskPhone(v) {
    v = v.replace(/\D/g, '').slice(0, 11);
    if (v.length <= 10) return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    return v.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  }
  $('[data-pix-doc]').addEventListener('input', function (e) { e.target.value = maskCPF(e.target.value); });
  $('[data-pix-phone]').addEventListener('input', function (e) { e.target.value = maskPhone(e.target.value); });

  function randCPF() {
    function rnd(n){var s='';for(var i=0;i<n;i++)s+=Math.floor(Math.random()*10);return s;}
    function dv(base){var sum=0,f=base.length+1;for(var i=0;i<base.length;i++)sum+=parseInt(base[i],10)*(f-i);var r=(sum*10)%11;return r===10?0:r;}
    var b=rnd(9);var d1=dv(b);var d2=dv(b+d1);return b+''+d1+''+d2;
  }
  function randPhone(){var d='11';for(var i=0;i<9;i++)d+=Math.floor(Math.random()*10);return d;}
  function slug(s){return (s||'').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g,'').slice(0,12)||'cliente';}

  function fillFromLead(u, autoDefaults) {
    u = u || {};
    if (u.name && !$('[data-pix-name]').value) $('[data-pix-name]').value = u.name;
    if (u.cpf && !$('[data-pix-doc]').value) $('[data-pix-doc]').value = maskCPF(u.cpf);
    if (u.email && !$('[data-pix-email]').value) $('[data-pix-email]').value = u.email;
    if (u.phone && !$('[data-pix-phone]').value) $('[data-pix-phone]').value = maskPhone(u.phone);
    if (autoDefaults) {
      if (!$('[data-pix-name]').value) $('[data-pix-name]').value = 'Cliente Drogarias';
      if (!$('[data-pix-doc]').value) $('[data-pix-doc]').value = maskCPF(randCPF());
      if (!$('[data-pix-email]').value) $('[data-pix-email]').value = slug($('[data-pix-name]').value)+'@gmail.com';
      if (!$('[data-pix-phone]').value) $('[data-pix-phone]').value = maskPhone(randPhone());
    }
  }

  function prefill(autoGenerate) {
    return fetch('/api/public/lead', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (d) { fillFromLead((d && d.lead) || {}, autoGenerate); })
      .catch(function () { fillFromLead({}, autoGenerate); });
  }

  function startCountdown(expiresAt) {
    var el = $('[data-pix-timer]');
    var end = new Date(expiresAt).getTime();
    function tick() {
      var left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      var m = String(Math.floor(left / 60)).padStart(2, '0');
      var s = String(left % 60).padStart(2, '0');
      el.textContent = 'Expira em ' + m + ':' + s;
      if (left <= 0) { clearInterval(countdownTimer); el.textContent = 'PIX expirado'; }
    }
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  function pollStatus(id) {
    pollTimer = setInterval(async function () {
      try {
        var r = await fetch('/api/pix/status/' + encodeURIComponent(id));
        var d = await r.json();
        var s = (d && (d.status || (d.data && d.data.status)) || '').toLowerCase();
        if (s === 'approved' || s === 'paid') {
          clearInterval(pollTimer); pollTimer = null;
          if (countdownTimer) clearInterval(countdownTimer);
          var el = $('[data-pix-status]');
          el.classList.add('paid');
          el.innerHTML = '<i class="fas fa-check-circle"></i><span>Pagamento aprovado!</span>';
        }
      } catch (_) {}
    }, 4000);
  }

  async function doGenerate() {
    var btn = $('[data-pix-generate]');
    var err = $('[data-pix-error]');
    err.style.display = 'none';
    var name = $('[data-pix-name]').value.trim();
    var doc = $('[data-pix-doc]').value.replace(/\D/g, '');
    var email = $('[data-pix-email]').value.trim();
    var phone = $('[data-pix-phone]').value.replace(/\D/g, '');
    if (name.length < 3) { err.textContent = 'Informe seu nome completo.'; err.style.display = 'block'; return; }
    if (doc.length !== 11) { err.textContent = 'CPF inválido.'; err.style.display = 'block'; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'E-mail inválido.'; err.style.display = 'block'; return; }
    if (phone.length < 10) { err.textContent = 'Telefone inválido.'; err.style.display = 'block'; return; }

    var amount = Number(overlay.dataset.amount || 0);
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Gerando PIX...';
    try {
      var r = await fetch('/api/pix/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          amount: amount,
          description: overlay.dataset.description || 'Pagamento',
          customer: { name: name, email: email, document: doc, phone: phone },
          fbp: getCookie('_fbp'),
          fbc: getFbc(),
          event_source_url: location.href,
          tracking: (function(){ try { return (window.getUtmifyTracking && window.getUtmifyTracking()) || JSON.parse(localStorage.getItem('utmify_tracking')||'{}'); } catch(_) { return {}; } })(),
        }),
      });
      var d = await r.json();
      if (!r.ok) throw new Error((d && d.details && (d.details.message || d.details.error)) || d.error || 'Falha ao gerar PIX');
      var code = d.qr_code || d.brcode || (d.pix && d.pix.qr_code);
      var qrUrl = d.qr_code_url || (d.pix && d.pix.qr_code_url);
      var id = d.id || d.transaction_id;
      if (!code) throw new Error('Resposta inválida da PinPay');
      $('[data-pix-form]').style.display = 'none';
      $('[data-pix-loading]').style.display = 'none';
      $('[data-pix-result]').style.display = 'block';
      $('[data-pix-code]').textContent = code;
      $('[data-pix-qrimg]').src = qrUrl || ('https://api.qrserver.com/v1/create-qr-code/?size=440x440&data=' + encodeURIComponent(code));
      if (d.expires_at) startCountdown(d.expires_at);
      if (id) pollStatus(id);
    } catch (e) {
      $('[data-pix-loading]').style.display = 'none';
      $('[data-pix-form]').style.display = 'block';
      err.textContent = e.message || 'Erro ao gerar PIX. Tente novamente.';
      err.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-qrcode" style="margin-right:6px;"></i>Gerar QR Code PIX';
    }
  }

  $('[data-pix-generate]').addEventListener('click', doGenerate);

  $('[data-pix-copy]').addEventListener('click', async function () {
    var btn = this;
    var code = $('[data-pix-code]').textContent;
    try { await navigator.clipboard.writeText(code); }
    catch (_) {
      var ta = document.createElement('textarea'); ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    var old = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check" style="margin-right:6px;"></i>Copiado!';
    setTimeout(function () { btn.innerHTML = old; }, 2000);
  });

  window.openPixModal = function (opts) {
    opts = opts || {};
    var amount = Number(opts.amount || 0);
    var auto = opts.auto !== false;
    overlay.dataset.amount = String(amount);
    overlay.dataset.description = opts.description || 'Pagamento';
    $$('[data-pix-amount]').forEach(function (n) { n.textContent = fmt(amount); });
    $('[data-pix-form]').style.display = auto ? 'none' : 'block';
    $('[data-pix-loading]').style.display = auto ? 'block' : 'none';
    $('[data-pix-result]').style.display = 'none';
    $('[data-pix-error]').style.display = 'none';
    var gen = $('[data-pix-generate]');
    gen.disabled = false;
    gen.innerHTML = '<i class="fas fa-qrcode" style="margin-right:6px;"></i>Gerar QR Code PIX';
    var st = $('[data-pix-status]');
    st.classList.remove('paid');
    st.innerHTML = '<span class="pix-spin"></span><span>Aguardando pagamento...</span>';
    overlay.classList.add('open');
    prefill(auto).then(function () { if (auto) doGenerate(); });
  };
})();
