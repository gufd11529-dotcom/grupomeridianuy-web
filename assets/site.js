/* Grupo Meridian — web corporativa · menú móvil, formulario de leads, eventos de Analytics, aviso de cookies */
(function () {
  // Menú móvil
  var pill = document.querySelector('.pill'), burger = document.querySelector('.burger');
  if (pill && burger) burger.addEventListener('click', function () {
    var open = pill.classList.toggle('open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.textContent = open ? 'Cerrar' : 'Menú';
  });

  function ga(name, params) { try { if (window.gtag) window.gtag('event', name, params || {}); } catch (e) {} }

  // Cada clic a WhatsApp cuenta como contacto
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href*="wa.me"],a[href*="api.whatsapp.com"]') : null;
    if (a) ga('contacto_whatsapp', { lead_source: location.pathname });
  }, true);

  // Formulario de contacto → misma hoja "Leads Grupo Meridian" que la tienda
  var F = document.getElementById('gm-lead');
  if (F) {
    var URL_SCRIPT = 'https://script.google.com/macros/s/AKfycbxsYt4D-WY0WaAjTui14gDQ9PoNtmvx2adc7aQtQeXGQzF3SCGa7Y_6IUK1Z5FllT0/exec';
    var TOKEN = 'TqiTnuCu2-MwyEyb-UN3qX1goYu1bcO-';
    var v = function (n) { var el = F.querySelector('[name="' + n + '"]'); return el ? String(el.value || '').trim() : ''; };
    F.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var err = document.getElementById('gm-lead-err'), ok = document.getElementById('gm-lead-ok'), btn = F.querySelector('button[type=submit]');
      if (v('web')) return; // honeypot
      var nom = v('nom'), emp = v('emp'), wa = v('wa');
      if (!nom || !emp || !wa) { err.classList.add('show'); return; }
      err.classList.remove('show');
      var d = { token: TOKEN, tipo: 'comercio', nombre: nom, comercio: emp, telefono: wa, departamento: v('depto'),
        tipo_comercio: 'Web .com · ' + v('need'), volumen: v('vol'),
        productos: 'Producto: ' + (v('prod') || '(sin describir)') + ' | Proveedor: ' + v('prov') + (v('mail') ? ' | Email: ' + v('mail') : ''),
        origen: 'grupomeridianuy.com' + location.pathname + (document.referrer ? ' ← ' + document.referrer : '') };
      try { fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) })['catch'](function () {}); } catch (e) {}
      ga('generate_lead', { lead_source: 'web_com', need: v('need'), volumen: v('vol') });
      var msg = 'Hola, soy ' + nom + ' de ' + emp + '. Necesito: ' + v('need') + '. Producto: ' + (v('prod') || '(lo cuento por acá)') + '. Volumen: ' + v('vol') + '.';
      ok.innerHTML = '<b>Recibido, ' + nom.replace(/</g, '') + '.</b> Te respondemos en el día, en horario comercial. Si preferís, también podés <a href="https://wa.me/59893682685?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">mandarnos esto mismo por WhatsApp</a>.';
      ok.classList.add('show'); btn.disabled = true; btn.style.opacity = '.5';
    });
  }

  // Aviso de cookies (solo informativo, se recuerda en el navegador)
  var ck = document.getElementById('ck');
  if (ck) {
    var seen = false; try { seen = localStorage.getItem('gm_ck') === '1'; } catch (e) {}
    if (!seen) ck.hidden = false;
    var b = ck.querySelector('button');
    if (b) b.addEventListener('click', function () { ck.hidden = true; try { localStorage.setItem('gm_ck', '1'); } catch (e) {} });
  }
})();
