/* Asistente de CosechaSelecta: botón flotante + ventana de chat.
   Se activa solo según /api/chat:
   - IA activa  -> chat con el asistente (y botón de WhatsApp si hay número)
   - solo número -> el botón abre WhatsApp directo
   - nada        -> no se muestra
   Usa las variables de color de la página (--forest, --surface, etc.). */
(function () {
  if (window.__csChat) return; window.__csChat = 1;
  var S_KEY = 'cs-chat-v1';
  var WA_TXT = 'Hola, vengo de cosechaselecta.com y tengo una consulta';
  var HOLA = '¡Hola! Soy el asistente de CosechaSelecta. Te ayudo con productos, precios, calibres, despacho y cómo reservar. ¿Qué necesitas?';
  var SUGS = ['¿Cómo compro?', '¿Cuánto cuesta el despacho?', 'Quiero comprar al por mayor'];

  var css = '' +
    '.csc-fab{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:38;width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;background:var(--forest,#1F4632);color:var(--forest-ink,#F4F7F2);display:grid;place-items:center;box-shadow:0 14px 30px -12px rgba(10,30,20,.55);transition:transform .15s ease}' +
    '.csc-fab:hover{transform:translateY(-2px)}.csc-fab svg{width:27px;height:27px}.csc-fab.wa{background:#1FA855;color:#fff}' +
    '.csc-fab:focus-visible,.csc-panel button:focus-visible,.csc-panel a:focus-visible,.csc-in textarea:focus-visible{outline:2px solid var(--gold,#C98F12);outline-offset:2px}' +
    '.csc-panel{position:fixed;right:18px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:39;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100dvh - 120px));display:flex;flex-direction:column;background:var(--surface,#fff);color:var(--ink,#14211A);border:1px solid var(--line,#D9E0D5);border-radius:18px;box-shadow:0 24px 60px -20px rgba(10,30,20,.45);overflow:hidden;font-family:var(--body,system-ui,sans-serif)}' +
    '.csc-panel[hidden]{display:none}' +
    '.csc-hd{display:flex;align-items:center;gap:10px;padding:12px 12px 12px 16px;background:var(--forest,#1F4632);color:var(--forest-ink,#F4F7F2)}' +
    '.csc-hd b{display:block;font-size:15px;line-height:1.2}.csc-hd small{font-size:12px;opacity:.8}.csc-hd .sp{flex:1;min-width:0}' +
    '.csc-x,.csc-wa{border:0;background:rgba(255,255,255,.14);color:inherit;border-radius:999px;height:34px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;text-decoration:none;font:600 12.5px var(--body,system-ui)}' +
    '.csc-x{width:34px;justify-content:center;font-size:20px;line-height:1}.csc-wa{padding:0 11px;background:#1FA855;color:#fff}.csc-wa svg{width:15px;height:15px}' +
    '.csc-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--bg,#FAFAF6)}' +
    '.csc-m{max-width:85%;padding:9px 13px;border-radius:14px;font-size:14.5px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}' +
    '.csc-m.b{align-self:flex-start;background:var(--surface,#fff);border:1px solid var(--line,#D9E0D5);border-bottom-left-radius:4px}' +
    '.csc-m.u{align-self:flex-end;background:var(--forest,#1F4632);color:var(--forest-ink,#F4F7F2);border-bottom-right-radius:4px}' +
    '.csc-m.e{align-self:center;background:var(--gold-soft,#F6EBCF);font-size:13px;text-align:center}' +
    '.csc-dots{display:inline-flex;gap:4px}.csc-dots i{width:6px;height:6px;border-radius:50%;background:var(--muted,#55645B);animation:cscb 1s infinite}.csc-dots i:nth-child(2){animation-delay:.15s}.csc-dots i:nth-child(3){animation-delay:.3s}' +
    '@keyframes cscb{0%,80%,100%{opacity:.25}40%{opacity:1}}' +
    '.csc-sg{display:flex;flex-wrap:wrap;gap:6px}.csc-sg button{border:1px solid var(--line,#D9E0D5);background:var(--surface,#fff);color:var(--ink,#14211A);border-radius:999px;padding:6px 11px;font:500 13px var(--body,system-ui);cursor:pointer}.csc-sg button:hover{border-color:var(--forest,#1F4632)}' +
    '.csc-in{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line,#D9E0D5);background:var(--surface,#fff)}' +
    '.csc-in textarea{flex:1;resize:none;border:1px solid var(--line,#D9E0D5);border-radius:12px;padding:9px 11px;font:15px/1.4 var(--body,system-ui);background:var(--bg,#FAFAF6);color:var(--ink,#14211A);max-height:110px}' +
    '.csc-in button{flex:0 0 42px;border:0;border-radius:12px;background:var(--forest,#1F4632);color:var(--forest-ink,#F4F7F2);cursor:pointer;display:grid;place-items:center}.csc-in button:disabled{opacity:.5;cursor:default}.csc-in svg{width:19px;height:19px}' +
    '.csc-ft{font-size:11px;color:var(--muted,#55645B);text-align:center;padding:0 10px 8px;background:var(--surface,#fff)}' +
    '.sr-csc{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}' +
    '@media (max-width:480px){.csc-panel{right:8px;left:8px;width:auto;bottom:calc(84px + env(safe-area-inset-bottom,0px));height:calc(100dvh - 110px)}.csc-fab{right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px))}}' +
    '@media (prefers-reduced-motion:reduce){.csc-fab,.csc-dots i{transition:none;animation:none}}';

  var IC_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>';
  var IC_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3z"/></svg>';
  var IC_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function waUrl(n) { return 'https://wa.me/' + n + '?text=' + encodeURIComponent(WA_TXT); }
  function load() { try { return JSON.parse(sessionStorage.getItem(S_KEY)) || []; } catch (e) { return []; } }
  function save(h) { try { sessionStorage.setItem(S_KEY, JSON.stringify(h.slice(-20))); } catch (e) {} }

  fetch('/api/chat', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (cfg) {
    if (!cfg || (!cfg.activo && !cfg.whatsapp)) return;
    var st = el('style'); st.textContent = css; document.head.appendChild(st);

    if (!cfg.activo) {
      var a = el('a', 'csc-fab wa', IC_WA);
      a.href = waUrl(cfg.whatsapp); a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', 'Escríbenos por WhatsApp');
      document.body.appendChild(a); return;
    }
    build(cfg.whatsapp);
  }).catch(function () {});

  function build(wa) {
    var hist = load(), busy = false;
    var fab = el('button', 'csc-fab', IC_CHAT);
    fab.type = 'button'; fab.setAttribute('aria-label', 'Abrir chat con el asistente'); fab.setAttribute('aria-expanded', 'false');
    var panel = el('div', 'csc-panel'); panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Chat con el asistente de CosechaSelecta');
    var hd = el('div', 'csc-hd', '<div class="sp"><b>Asistente CosechaSelecta</b><small>Responde al instante</small></div>');
    if (wa) {
      var w = el('a', 'csc-wa', IC_WA + '<span>WhatsApp</span>');
      w.href = waUrl(wa); w.target = '_blank'; w.rel = 'noopener'; w.setAttribute('aria-label', 'Hablar con una persona por WhatsApp');
      hd.appendChild(w);
    }
    var x = el('button', 'csc-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar chat'); hd.appendChild(x);
    var log = el('div', 'csc-log'); log.setAttribute('aria-live', 'polite');
    var form = el('form', 'csc-in');
    form.innerHTML = '<label class="sr-csc" for="csc-t">Escribe tu pregunta</label><textarea id="csc-t" rows="1" maxlength="1000" placeholder="Escribe tu pregunta…"></textarea><button type="submit" aria-label="Enviar">' + IC_SEND + '</button>';
    var ta = form.querySelector('textarea'), send = form.querySelector('button');
    var ft = el('div', 'csc-ft', 'Asistente con IA: puede equivocarse. Precios referenciales.');
    panel.appendChild(hd); panel.appendChild(log); panel.appendChild(form); panel.appendChild(ft);
    document.body.appendChild(panel); document.body.appendChild(fab);

    function bubble(cls, text) { var m = el('div', 'csc-m ' + cls); m.textContent = text; log.appendChild(m); log.scrollTop = log.scrollHeight; return m; }
    function render() {
      log.innerHTML = '';
      bubble('b', HOLA);
      hist.forEach(function (m) { bubble(m.role === 'user' ? 'u' : 'b', m.content); });
      if (!hist.length) {
        var sg = el('div', 'csc-sg');
        SUGS.forEach(function (s) { var b = el('button'); b.type = 'button'; b.textContent = s; b.onclick = function () { ask(s); }; sg.appendChild(b); });
        log.appendChild(sg);
      }
    }
    function toggle(open) {
      panel.hidden = !open; fab.setAttribute('aria-expanded', String(open));
      fab.setAttribute('aria-label', open ? 'Cerrar chat' : 'Abrir chat con el asistente');
      if (open) { render(); setTimeout(function () { ta.focus(); }, 30); }
    }
    function ask(text) {
      text = (text || '').trim(); if (!text || busy) return;
      var sg = log.querySelector('.csc-sg'); if (sg) sg.remove();
      hist.push({ role: 'user', content: text }); save(hist); bubble('u', text);
      ta.value = ''; ta.style.height = ''; busy = true; send.disabled = true;
      var wait = el('div', 'csc-m b', '<span class="csc-dots" aria-label="Escribiendo"><i></i><i></i><i></i></span>'); log.appendChild(wait); log.scrollTop = log.scrollHeight;
      fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: hist }) })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (d) {
          wait.remove();
          if (d && d.reply) { hist.push({ role: 'assistant', content: d.reply }); save(hist); bubble('b', d.reply); }
          else { hist.pop(); save(hist); bubble('e', ((d && d.error) || 'No pude responder.') + (wa ? ' Puedes escribirnos por WhatsApp.' : '')); }
        })
        .catch(function () { wait.remove(); hist.pop(); save(hist); bubble('e', 'Sin conexión. Intenta de nuevo.'); })
        .then(function () { busy = false; send.disabled = false; ta.focus(); });
    }
    fab.onclick = function () { toggle(panel.hidden); };
    x.onclick = function () { toggle(false); fab.focus(); };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { toggle(false); fab.focus(); } });
    form.onsubmit = function (e) { e.preventDefault(); ask(ta.value); };
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(ta.value); } });
    ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 110) + 'px'; });
  }
})();
