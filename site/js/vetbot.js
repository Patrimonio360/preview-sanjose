// Chat de VetBot en la web: botón flotante + ventana de conversación.
// El cerebro está en el servidor (api/vetbot.js), el mismo que usa VetBot Pro
// por WhatsApp, así que las respuestas y las citas son iguales en ambos sitios.
(function () {
  var API = 'https://preview-sanjose.vercel.app/api/vetbot';
  var STORE_KEY = 'vetbot-chat-v1';

  // Conversación guardada mientras dure la visita (al cambiar de página sigue).
  var chat = { open: false, state: null, messages: [] };
  try { chat = Object.assign(chat, JSON.parse(sessionStorage.getItem(STORE_KEY)) || {}); } catch (e) {}
  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ open: chat.open, state: chat.state, messages: chat.messages.slice(-40) })); } catch (e) {}
  }

  var css = ''
    + '.vb-fab{position:fixed;right:20px;bottom:20px;z-index:310;display:flex;align-items:center;gap:10px;background:var(--forest,#1A3C2A);color:#fff;border:none;border-radius:50px;padding:14px 20px 14px 16px;font:600 .9rem Inter,system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.25);cursor:pointer;transition:transform .2s}'
    + '.vb-fab:hover{transform:translateY(-2px)}.vb-fab-icon{font-size:22px;line-height:1}'
    + '.vb-fab-dot{width:9px;height:9px;border-radius:50%;background:#4ADE80;box-shadow:0 0 0 3px rgba(74,222,128,.3)}'
    + '.scroll-top{bottom:92px!important}'
    + '.footer-bottom{padding-bottom:88px}' /* que el botón del chat no tape el final del pie */
    + '.vb-panel{position:fixed;right:20px;bottom:20px;z-index:320;width:380px;max-width:calc(100vw - 24px);height:600px;max-height:calc(100vh - 40px);max-height:calc(100dvh - 40px);background:var(--white,#fff);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;font-family:Inter,system-ui,sans-serif}'
    + '.vb-panel.open{display:flex}'
    + '.vb-head{background:var(--forest,#1A3C2A);color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px}'
    + '.vb-avatar{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}'
    + '.vb-title{font-weight:700;font-size:.95rem}.vb-sub{font-size:.75rem;opacity:.8}'
    + '.vb-close{margin-left:auto;background:rgba(255,255,255,.15);border:none;color:#fff;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:16px}'
    + '.vb-body{flex:1;overflow-y:auto;padding:16px;background:var(--cream,#FBF9F5);display:flex;flex-direction:column;gap:10px}'
    + '.vb-msg{max-width:85%;padding:10px 14px;border-radius:16px;font-size:.88rem;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}'
    + '.vb-msg a{color:inherit;text-decoration:underline}'
    + '.vb-bot{background:var(--white,#fff);color:var(--charcoal,#1C1C1C);border:1px solid rgba(0,0,0,.07);align-self:flex-start;border-bottom-left-radius:4px}'
    + '.vb-user{background:var(--forest,#1A3C2A);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}'
    + '.vb-options{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;max-width:100%}'
    + '.vb-opt{background:var(--white,#fff);border:1.5px solid var(--forest,#1A3C2A);color:var(--forest,#1A3C2A);border-radius:50px;padding:6px 12px;font:600 .8rem Inter,system-ui,sans-serif;cursor:pointer}'
    + '.vb-opt:hover{background:var(--forest,#1A3C2A);color:#fff}'
    + '.vb-typing{align-self:flex-start;background:var(--white,#fff);border:1px solid rgba(0,0,0,.07);border-radius:16px;padding:12px 14px;display:flex;gap:4px}'
    + '.vb-typing span{width:7px;height:7px;border-radius:50%;background:#bbb;animation:vb-dot 1.2s infinite}.vb-typing span:nth-child(2){animation-delay:.2s}.vb-typing span:nth-child(3){animation-delay:.4s}'
    + '@keyframes vb-dot{0%,60%,100%{opacity:.3}30%{opacity:1}}'
    + '.vb-form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(0,0,0,.07);background:var(--white,#fff)}'
    + '.vb-input{flex:1;min-width:0;border:1.5px solid rgba(0,0,0,.12);border-radius:12px;padding:11px 14px;font:.9rem Inter,system-ui,sans-serif;outline:none}'
    + '.vb-input:focus{border-color:var(--forest,#1A3C2A)}'
    + '.vb-send{background:var(--coral,#D4764E);color:#fff;border:none;border-radius:12px;padding:0 16px;font-size:1.1rem;cursor:pointer}'
    + '.vb-send:disabled{opacity:.5;cursor:default}'
    + '.vb-legal{font-size:.68rem;color:var(--gray500,#6B6B6B);text-align:center;padding:0 12px 10px;background:var(--white,#fff)}'
    + '.vb-legal a{color:inherit}'
    + '@media(max-width:480px){.vb-panel{right:0;bottom:0;width:100vw;max-width:100vw;height:100vh;height:100dvh;max-height:none;border-radius:0}.vb-fab-text{display:none}.vb-fab{padding:14px}}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var fab = document.createElement('button');
  fab.className = 'vb-fab';
  fab.setAttribute('aria-label', 'Abrir chat con VetBot');
  fab.innerHTML = '<span class="vb-fab-icon">🐾</span><span class="vb-fab-text">¿Te ayudamos?</span><span class="vb-fab-dot"></span>';

  var panel = document.createElement('div');
  panel.className = 'vb-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Chat con VetBot');
  panel.innerHTML = ''
    + '<div class="vb-head"><div class="vb-avatar">🐾</div><div><div class="vb-title">VetBot</div><div class="vb-sub" data-vb-clinic>Asistente virtual · responde al momento</div></div>'
    + '<button class="vb-close" aria-label="Cerrar chat">✕</button></div>'
    + '<div class="vb-body" aria-live="polite"></div>'
    + '<form class="vb-form"><input class="vb-input" type="text" maxlength="500" placeholder="Escribe tu mensaje..." aria-label="Mensaje"><button class="vb-send" type="submit" aria-label="Enviar">➤</button></form>'
    + '<div class="vb-legal">Asistente automático. No sustituye una consulta veterinaria. <a href="politica-privacidad.html">Privacidad</a></div>';

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  var body = panel.querySelector('.vb-body');
  var input = panel.querySelector('.vb-input');
  var sendBtn = panel.querySelector('.vb-send');
  var busy = false;

  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  // Texto del bot: enlaces clicables y *negrita* como en WhatsApp.
  function format(text) {
    return esc(text)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">abrir enlace</a>')
      .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
  }

  function render() {
    body.innerHTML = '';
    chat.messages.forEach(function (m, i) {
      var div = document.createElement('div');
      div.className = 'vb-msg ' + (m.role === 'user' ? 'vb-user' : 'vb-bot');
      div.innerHTML = m.role === 'user' ? esc(m.text) : format(m.text);
      body.appendChild(div);
      // Botones de respuesta rápida solo en el último mensaje del bot.
      if (m.options && i === chat.messages.length - 1) {
        var wrap = document.createElement('div');
        wrap.className = 'vb-options';
        m.options.forEach(function (o) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'vb-opt';
          b.textContent = o;
          b.addEventListener('click', function () { send(o); });
          wrap.appendChild(b);
        });
        body.appendChild(wrap);
      }
    });
    body.scrollTop = body.scrollHeight;
  }

  function greet() {
    if (chat.messages.length) return;
    var name = (document.querySelector('[data-clinic="name"]') || {}).textContent || 'la clínica';
    chat.messages.push({
      role: 'bot',
      text: '¡Hola! 👋 Soy VetBot, el asistente de ' + name.trim() + '. Puedo ayudarte a pedir cita o resolver dudas sobre la clínica. ¿Qué necesitas?',
      options: ['Pedir cita', 'Horario', '¿Dónde estáis?']
    });
  }

  function setOpen(open) {
    chat.open = open;
    panel.classList.toggle('open', open);
    fab.style.display = open ? 'none' : '';
    if (open) {
      greet();
      render();
      if (window.innerWidth > 480) input.focus();
    }
    save();
  }

  function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    var history = chat.messages.slice(-8).map(function (m) { return { role: m.role, text: m.text }; });
    chat.messages.push({ role: 'user', text: text });
    render();
    var typing = document.createElement('div');
    typing.className = 'vb-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'web', message: text, state: chat.state, history: history })
    })
      .then(function (r) { return r.json().then(function (out) { return { ok: r.ok, out: out }; }); })
      .then(function (res) {
        if (!res.ok || !res.out.reply) throw new Error(res.out.error || 'error');
        chat.state = res.out.state || null;
        chat.messages.push({ role: 'bot', text: res.out.reply, options: res.out.options });
      })
      .catch(function () {
        var phone = (document.querySelector('.nav-cta') || {}).textContent || '';
        chat.messages.push({ role: 'bot', text: 'Ahora mismo no puedo conectar. 🙏 Inténtalo en un momento' + (phone ? ' o llámanos al ' + phone.replace(/[^\d ]/g, '').trim() : '') + '.' });
      })
      .then(function () {
        busy = false;
        sendBtn.disabled = false;
        save();
        render();
        if (window.innerWidth > 480) input.focus();
      });
  }

  fab.addEventListener('click', function () { setOpen(true); });
  // Cerrar con la ✕ termina la conversación: al volver a abrir empieza de cero.
  function endChat() {
    chat.messages = [];
    chat.state = null;
    setOpen(false);
  }
  panel.querySelector('.vb-close').addEventListener('click', endChat);
  panel.querySelector('.vb-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = input.value;
    input.value = '';
    send(t);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && chat.open) endChat(); });
  // Enlaces o botones de la web que abren el chat
  document.querySelectorAll('.vetbot-trigger, [data-open-vetbot]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); setOpen(true); });
  });

  if (chat.open) setOpen(true);
})();
