/* Grupo Meridian — web corporativa · menú móvil, formulario de leads, eventos de Analytics, aviso de cookies */
(function () {
  // Menú móvil
  var pill = document.querySelector('.pill'), burger = document.querySelector('.burger');
  if (pill && burger) burger.addEventListener('click', function () {
    var open = pill.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.textContent = open ? 'Cerrar' : 'Menú';
  });

  // ---- Utilidades compartidas con asesor.js y calculadora.js (window.GM lo crea build.py con la URL del Apps Script y el token)
  var GM = window.GM = window.GM || {};
  GM.ga = function (name, params) { try { if (window.gtag) window.gtag('event', name, params || {}); } catch (e) {} };
  GM.esc = function (s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  // Envía el lead al Apps Script. ok() si el navegador lo manda; ko() si falla (sin red, bloqueado...).
  // Corta «productos» y «origen» a 1.900 caracteres (el servidor rechaza más de 2.000).
  GM.enviar = function (d, ok, ko) {
    var p = { token: GM.token }, k;
    for (k in d) if (Object.prototype.hasOwnProperty.call(d, k)) p[k] = d[k];
    ['productos', 'origen'].forEach(function (c) { if (p[c] && p[c].length > 1900) p[c] = p[c].slice(0, 1899) + '\u2026'; });
    try {
      fetch(GM.script, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) })
        .then(function () { if (ok) ok(); }, function () { if (ko) ko(); });
    } catch (e) { if (ko) ko(); }
  };
  // Mensaje de fallo en lugar del de éxito, con enlace a WhatsApp (href ya armado)
  GM.fallo = function (box, href, extra) {
    box.innerHTML = '<b>No pudimos enviar tu consulta.</b> <a href="' + href + '" target="_blank" rel="noopener">Escribinos por WhatsApp</a>.' + (extra || '');
    box.classList.add('show');
  };
  var ga = GM.ga, WA_URL = 'https://wa.me/59893682685';

  // WhatsApp con el nombre de la página o la guía desde la que se escribe
  var WA_SEL = 'a[href*="wa.me"],a[href*="api.whatsapp.com"]';
  function pageCtx() {
    var p = location.pathname, h = document.querySelector('h1'), t = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
    if (/^\/guias\/[^/]+\/?$/.test(p) && t) return 'la guía "' + t + '"';
    if (p.indexOf('/guia-pdf/') === 0) return 'la checklist "Antes de pagarle al proveedor"';
    var M = { '/': 'la portada de la web', '/calculadora/': 'la calculadora de importación', '/guias/': 'el listado de guías', '/servicios/': 'la página de servicios', '/contacto/': 'la página de contacto', '/asesor/': 'el asesor de importación', '/sobre-nosotros/': 'la página "Sobre nosotros"', '/importacion-para-empresas/': 'la página de importación para empresas' };
    return M[p] || (t ? 'la página "' + t + '"' : 'la web');
  }
  var CTX_MSG = 'Hola, vengo de ' + pageCtx() + ' y quiero consultar por una importación.';
  Array.prototype.forEach.call(document.querySelectorAll(WA_SEL), function (a) {
    var h = a.getAttribute('href') || '';
    if (h.indexOf('wa.me') > -1 && (h.indexOf('text=') === -1 || h.indexOf('desde%20la%20web%20de%20Grupo%20Meridian') > -1))
      a.setAttribute('href', h.split('?')[0] + '?text=' + encodeURIComponent(CTX_MSG));
  });

  // Cada clic a WhatsApp cuenta como contacto
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href*="wa.me"],a[href*="api.whatsapp.com"]') : null;
    if (a) ga('contacto_whatsapp', { lead_source: location.pathname });
    var m = e.target && e.target.closest ? e.target.closest('a[href^="mailto:"],a[href^="tel:"]') : null;
    if (m) ga(m.getAttribute('href').indexOf('tel:') === 0 ? 'contacto_telefono' : 'contacto_email', { lead_source: location.pathname });
  }, true);

  // Formulario de contacto → misma hoja "Leads Grupo Meridian" que la tienda
  var F = document.getElementById('gm-lead');
  if (F) {
    var v = function (n) { var el = F.querySelector('[name="' + n + '"]'); return el ? String(el.value || '').trim() : ''; };
    F.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var err = document.getElementById('gm-lead-err'), ok = document.getElementById('gm-lead-ok'), btn = F.querySelector('button[type=submit]');
      if (v('web')) return; // honeypot
      var nom = v('nom'), emp = v('emp'), wa = v('wa');
      if (!nom || !emp || !wa) { err.classList.add('show'); return; }
      err.classList.remove('show');
      var d = { tipo: 'comercio', nombre: nom, comercio: emp, telefono: wa, departamento: v('depto'),
        tipo_comercio: 'Web .com · ' + v('need'), volumen: v('vol'),
        productos: 'Producto: ' + (v('prod') || '(sin describir)') + ' | Proveedor: ' + v('prov') + (v('mail') ? ' | Email: ' + v('mail') : ''),
        origen: 'grupomeridianuy.com' + location.pathname + location.search + (document.referrer ? ' ← ' + document.referrer : '') };
      var msg = 'Hola, soy ' + nom + ' de ' + emp + '. Necesito: ' + v('need') + '. Producto: ' + (v('prod') || '(lo cuento por acá)') + '. Volumen: ' + v('vol') + '.';
      btn.disabled = true; btn.style.opacity = '.5';
      GM.enviar(d, function () {
        ga('generate_lead', { lead_source: 'web_com', need: v('need'), volumen: v('vol') });
        ok.innerHTML = '<b>Recibido, ' + nom.replace(/</g, '') + '.</b> Te respondemos en horario comercial. Si preferís, también podés <a href="https://wa.me/59893682685?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">mandarnos esto mismo por WhatsApp</a>.';
        ok.classList.add('show');
      }, function () {
        GM.fallo(ok, WA_URL + '?text=' + encodeURIComponent(msg));
        btn.disabled = false; btn.style.opacity = '';
      });
    });
  }

  // Consentimiento (Google Consent Mode v2). Todo denegado por defecto; Analytics solo se activa si se acepta.
  var ck = document.getElementById('ck');
  function getC() { try { return localStorage.getItem('gm_consent'); } catch (e) { return null; } }
  function setC(v) { try { localStorage.setItem('gm_consent', v); } catch (e) {} }
  function borrarGA() {
    var host = location.hostname.split('.'), doms = ['', location.hostname];
    if (host.length > 1) doms.push('.' + host.slice(-2).join('.'), '.' + location.hostname);
    document.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim();
      if (n === '_ga' || n.indexOf('_ga_') === 0 || n === '_gid') doms.forEach(function (d) { document.cookie = n + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : ''); });
    });
  }
  function showCk() {
    if (!ck) return;
    ck.hidden = false; document.body.classList.add('ck-on');
    document.documentElement.style.setProperty('--ckh', ck.offsetHeight + 'px');
  }
  function hideCk() { if (!ck) return; ck.hidden = true; document.body.classList.remove('ck-on'); }
  function decidir(v) {
    var antes = getC();
    setC(v); hideCk();
    if (v === 'granted') {
      if (window.gtag) { window.gtag('consent', 'update', { analytics_storage: 'granted' }); if (window.gmGA) window.gmGA(); }
    } else {
      if (window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied' });
      if (antes === 'granted') { borrarGA(); location.reload(); } // frena lo que ya estuviera activo en esta página
    }
  }
  if (ck) {
    if (!getC()) showCk();
    Array.prototype.forEach.call(ck.querySelectorAll('[data-ck]'), function (b) { b.addEventListener('click', function () { decidir(b.getAttribute('data-ck')); }); });
    window.addEventListener('resize', function () { if (!ck.hidden) document.documentElement.style.setProperty('--ckh', ck.offsetHeight + 'px'); });
  }
  document.addEventListener('click', function (e) {
    var r = e.target && e.target.closest ? e.target.closest('[data-ck-reset]') : null;
    if (r) { e.preventDefault(); showCk(); }
  });

  // Checklist en PDF (imán de contactos) → misma hoja "Leads Grupo Meridian"
  var P = document.getElementById('gm-pdf');
  if (P) P.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var g = function (n) { var x = P.querySelector('[name="' + n + '"]'); return x ? String(x.value || '').trim() : ''; };
    if (g('web')) return; // honeypot
    var err = document.getElementById('gm-pdf-err'), ok = document.getElementById('gm-pdf-ok'), btn = P.querySelector('button[type=submit]');
    var nom = g('nom'), mail = g('mail');
    if (!nom || !/^[^\s@|]+@[^\s@|]+\.[^\s@|]+$/.test(mail)) { err.classList.add('show'); return; }
    err.classList.remove('show');
    var rubro = g('rubro') || '(sin indicar)';
    var d = { tipo: 'comercio', nombre: nom, comercio: '(sin empresa) ' + nom.slice(0, 60), telefono: '', departamento: '',
      tipo_comercio: 'Checklist proveedor', volumen: '',
      productos: 'Producto: ' + rubro + ' | Proveedor: ' + g('prov') + ' | Descargó la checklist «Antes de pagarle al proveedor» || Email: ' + mail,
      origen: 'grupomeridianuy.com' + location.pathname + location.search + (document.referrer ? ' ← ' + document.referrer : '') };
    var msg = 'Hola, soy ' + nom.replace(/</g, '') + '. Bajé la checklist "Antes de pagarle al proveedor" y quiero que revisen mi caso. Producto: ' + rubro + '.';
    btn.disabled = true; btn.style.opacity = '.5';
    GM.enviar(d, function () {
      ga('generate_lead', { lead_source: 'checklist_proveedor', rubro: rubro });
      ok.innerHTML = '<b>Gracias, ' + nom.replace(/</g, '') + '.</b> Acá está tu checklist: <a href="/descargas/antes-de-pagarle-al-proveedor.pdf" download target="_blank" rel="noopener">Descargar el PDF</a>. Si querés que revisemos tu caso, <a href="https://wa.me/59893682685?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">escribinos por WhatsApp</a>.';
      ok.classList.add('show');
      ga('checklist_descarga_visible', { lead_source: 'checklist_proveedor' });
    }, function () {
      GM.fallo(ok, WA_URL + '?text=' + encodeURIComponent(msg), ' El PDF sí lo podés bajar: <a href="/descargas/antes-de-pagarle-al-proveedor.pdf" download target="_blank" rel="noopener">Descargar el PDF</a>.');
      btn.disabled = false; btn.style.opacity = '';
    });
  });
})();
