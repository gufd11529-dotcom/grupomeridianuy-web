/* Grupo Meridian — Asesor de importación (/asesor/ y portada)
   Preguntas con ramas → conclusión para el visitante → captura del contacto con prioridad A/B/C
   Los datos van a la misma hoja "Leads Grupo Meridian" que la tienda (Apps Script). */
(function () {
  var root = document.getElementById("asesor");
  if (!root) return;

  var URL_SCRIPT = 'https://script.google.com/macros/s/AKfycbxsYt4D-WY0WaAjTui14gDQ9PoNtmvx2adc7aQtQeXGQzF3SCGa7Y_6IUK1Z5FllT0/exec';
  var TOKEN = 'TqiTnuCu2-MwyEyb-UN3qX1goYu1bcO-';
  var WA = 'https://wa.me/59893682685';
  var SHOP_ASESOR = 'https://grupomeridian.shop/asesor/';

  function ga(n, p) { try { if (window.gtag) window.gtag('event', n, p || {}); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var CAT = {
    alim: { l: 'Alimentos o bebidas', p: 'Alimentos y bebidas necesitan empresa habilitada en el MSP, registro bromatológico del producto antes de importar y certificado del LATU. Las aguas saborizadas o con azúcar llevan además licencia del MSP.' },
    cosm: { l: 'Cosmética, perfumería o higiene personal', p: 'Los cosméticos necesitan empresa habilitada en el MSP y registro de cada producto. Algunos pagan IMESI.' },
    limp: { l: 'Limpieza o desinfección', p: 'Los productos de limpieza y desinfección (domisanitarios) necesitan empresa habilitada en el MSP y registro de cada producto.' },
    masc: { l: 'Productos para mascotas', p: 'Si es alimento para animales, necesita registro en el MGAP y solicitud de importación por VUCE. Accesorios e higiene suelen no tener registro específico: lo confirmamos por su código arancelario.' },
    elec: { l: 'Eléctricos o electrónicos', p: 'Los eléctricos de baja tensión incluidos en el reglamento de URSEA necesitan autorización previa con certificado de conformidad (LATU, LSQA o UNIT).' },
    text: { l: 'Ropa, textil o calzado', p: 'Ropa, textiles y calzado necesitan licencia automática de importación del MIEM, válida 60 días.' },
    hogar: { l: 'Hogar, bazar o ferretería', p: 'La mayoría de los artículos de hogar y ferretería no requieren registro previo, salvo que sean eléctricos o estén en contacto con alimentos. Lo confirmamos por su código arancelario.' },
    jug: { l: 'Juguetes', p: 'Los juguetes necesitan certificación del LATU antes de venderse.' },
    otro: { l: 'Otro', p: 'Revisamos por su código arancelario si tu producto necesita alguna habilitación antes de embarcar.' }
  };

  var STEPS = [
    { id: 'obj', q: '¿Qué querés hacer?', o: [
      ['importar', 'Traer un producto de afuera para venderlo', 'Nosotros lo importamos; vos lo vendés.'],
      ['lanzar', 'Vender en Uruguay un producto que ya tengo', 'Lo presentamos a mayoristas, supermercados y almacenes.'],
      ['aprender', 'Importar por mi cuenta, con ayuda para armarlo', 'Te armamos la estructura que usamos nosotros.'],
      ['arena', 'Comprar arena para gatos al por mayor', 'Nuestra línea propia, para comercios.']] },
    { id: 'perfil', q: '¿Quién sos?', o: [
      ['empresa', 'Empresa o comercio con RUT'],
      ['distri', 'Distribuidora o mayorista'],
      ['marca', 'Fabricante o marca'],
      ['empr', 'Emprendedor, todavía sin empresa']] },
    { id: 'cat', q: '¿Qué tipo de producto es?', o: Object.keys(CAT).map(function (k) { return [k, CAT[k].l]; }) },
    { id: 'prov', q: '¿Ya tenés proveedor?', when: function (s) { return s.obj !== 'lanzar'; }, o: [
      ['si', 'Sí, con precio'],
      ['opciones', 'Tengo opciones, pero no decidí'],
      ['no', 'No, necesito que lo busquen']] },
    { id: 'hoy', q: '¿Dónde se vende hoy tu producto?', when: function (s) { return s.obj === 'lanzar'; }, o: [
      ['uy', 'Ya se vende en Uruguay'],
      ['afuera', 'Se vende en otro país'],
      ['nada', 'Todavía no se vende en ningún lado']] },
    { id: 'stock', q: '¿Tenés el producto en Uruguay?', when: function (s) { return s.obj === 'lanzar'; }, o: [
      ['si', 'Sí, ya tengo stock acá'],
      ['viene', 'Está por llegar'],
      ['no', 'No, hay que importarlo']] },
    { id: 'vol', q: '¿Cuánto pensás invertir en la primera compra?', when: function (s) { return s.obj !== 'lanzar'; }, o: [
      ['v1', 'Menos de USD 5.000'],
      ['v2', 'USD 5.000 a 20.000'],
      ['v3', 'USD 20.000 a 50.000'],
      ['v4', 'Más de USD 50.000'],
      ['v0', 'No lo sé todavía']] },
    { id: 'canal', q: '¿Dónde lo querés vender?', o: [
      ['super', 'Supermercados'],
      ['mayor', 'Distribuidoras y mayoristas'],
      ['alm', 'Almacenes y comercios'],
      ['online', 'Venta online'],
      ['propio', 'Es para uso de mi empresa'],
      ['nose', 'Todavía no lo sé']] },
    { id: 'plazo', q: '¿Para cuándo lo necesitás?', o: [
      ['p1', 'En menos de un mes'],
      ['p2', 'En 1 a 3 meses'],
      ['p3', 'En 3 a 6 meses'],
      ['p0', 'Solo estoy averiguando']] }
  ];

  var s = {}, hist = [], started = false;
  var body = root.querySelector('.dx-body'), bar = root.querySelector('.dx-bar i'), count = root.querySelector('.dx-count');

  function visible() { return STEPS.filter(function (st) { return !st.when || st.when(s); }); }
  function label(id) {
    var st = STEPS.filter(function (x) { return x.id === id; })[0];
    if (!st || !s[id]) return '';
    var o = st.o.filter(function (x) { return x[0] === s[id]; })[0];
    return o ? o[1] : '';
  }

  function render(i) {
    var vs = visible(), st = vs[i];
    if (!st) return result();
    bar.style.width = Math.round((i / vs.length) * 100) + '%';
    count.textContent = 'Pregunta ' + (i + 1) + ' de ' + vs.length;
    var h = '<h2 class="dx-q" tabindex="-1">' + st.q + '</h2><div class="dx-opts">';
    st.o.forEach(function (o) {
      h += '<button type="button" class="dx-opt' + (s[st.id] === o[0] ? ' on' : '') + '" data-v="' + o[0] + '"><b>' + o[1] + '</b>' + (o[2] ? '<span>' + o[2] + '</span>' : '') + '</button>';
    });
    h += '</div>' + (i > 0 ? '<button type="button" class="dx-back">← Volver</button>' : '');
    body.innerHTML = h;
    body.querySelector('.dx-q').focus({ preventScroll: true });
    body.querySelectorAll('.dx-opt').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!started) { started = true; ga('asesor_inicio', { objetivo: b.dataset.v }); }
        if (st.id === 'obj' && s.obj !== b.dataset.v) s = {};
        s[st.id] = b.dataset.v;
        if (st.id === 'obj' && b.dataset.v === 'arena') return arena();
        hist.push(i);
        render(i + 1);
        scrollTop();
      });
    });
    var back = body.querySelector('.dx-back');
    if (back) back.addEventListener('click', function () { render(hist.pop() || 0); scrollTop(); });
  }

  function scrollTop() {
    var r = root.getBoundingClientRect();
    if (r.top < 0) window.scrollTo({ top: window.scrollY + r.top - 100, behavior: 'smooth' });
  }

  function arena() {
    bar.style.width = '100%'; count.textContent = '';
    body.innerHTML = '<h2 class="dx-q">Para arena al por mayor, usá el asesor de la tienda</h2><p class="dx-p">En un minuto te decimos qué productos conviene tener según tu tipo de comercio y te enviamos la lista mayorista.</p><p><a class="btn dark" href="' + SHOP_ASESOR + '">Ir al asesor mayorista</a></p><button type="button" class="dx-back">← Volver</button>';
    ga('asesor_arena');
    body.querySelector('.dx-back').addEventListener('click', function () { delete s.obj; render(0); });
  }

  // ---------- conclusión
  function servicio() {
    if (s.obj === 'aprender') return ['Estructura de importación', 'Te armamos la misma operación que usamos nosotros: fabricante verificado, forma de pago segura, despachante, costo puesto en Uruguay y habilitaciones. Después la ejecutás vos.', 'estructura'];
    if (s.obj === 'lanzar' && s.stock === 'no') return ['Importación y lanzamiento al mercado', 'Primero traemos el producto a Uruguay y después lo presentamos a nuestros compradores: distribuidoras mayoristas, supermercados y almacenes.', 'lanzamiento'];
    if (s.obj === 'lanzar') return ['Lanzamiento al mercado', 'Presentamos tu producto a las distribuidoras mayoristas, supermercados y almacenes con los que ya trabajamos, con muestras y un plan de entrada.', 'lanzamiento'];
    return ['Importación a medida', 'Nos encargamos de la operación completa: fabricante, carga, aduana con despachante habilitado y entrega en tu depósito o en el nuestro de Pando.', 'importacion'];
  }

  function puntos() {
    var p = [];
    if (s.perfil === 'empr') p.push('Para importar a tu nombre hace falta una empresa inscrita en el RUT. Si todavía no la tenés, vemos juntos la mejor forma de empezar, incluida la opción de que la importación la hagamos nosotros.');
    if (s.prov === 'no') p.push('Buscamos y verificamos el fabricante: muestras, antecedentes y condiciones por escrito antes de la primera orden.');
    if (s.prov === 'opciones') p.push('Te ayudamos a comparar los proveedores que tenés: calidad, condiciones de pago y costo real puesto en Uruguay, no solo el precio de fábrica.');
    if (s.vol === 'v1') p.push('Con una primera compra chica conviene consolidar: tu carga viaja dentro de un contenedor compartido y el flete por unidad baja mucho.');
    if (s.vol === 'v0') p.push('Antes de definir cuánto comprar, calculamos el costo puesto en Uruguay: producto, flete, arancel, tasa consular, IVA y despacho.');
    if (CAT[s.cat]) p.push(CAT[s.cat].p);
    if (s.canal === 'super') p.push('Para supermercados vas a necesitar código de barras GS1, factura electrónica y alta como proveedor. Nosotros presentamos el producto; la decisión de listarlo es del comprador.');
    if (s.canal === 'mayor' || s.canal === 'alm') p.push('Las distribuidoras y los almacenes son buena puerta de entrada para un producto nuevo: llegan a muchos puntos de venta y dan datos de rotación.');
    if (s.plazo === 'p1' && s.obj !== 'lanzar') p.push('Menos de un mes es muy justo para importar: solo el tránsito marítimo desde China ronda 30 a 40 días, sin contar producción. Te damos plazos reales al analizar tu caso.');
    if (s.hoy === 'nada') p.push('Un producto que todavía no se vende en ningún lado conviene probarlo primero en un canal chico, como almacenes o venta online, para tener datos antes de ir a una cadena.');
    return p;
  }

  function guias() {
    var g = [];
    if (s.obj !== 'lanzar') g.push(['/guias/costos-de-importar-a-uruguay/', 'Cuánto cuesta importar a Uruguay']);
    if (['alim', 'cosm', 'limp', 'masc', 'elec', 'text', 'jug'].indexOf(s.cat) > -1) g.push(['/guias/habilitaciones-para-importar-en-uruguay/', 'Qué productos necesitan habilitación']);
    if (s.canal === 'super' || s.obj === 'lanzar') g.push(['/guias/vender-en-supermercados-uruguay/', 'Cómo llegar a supermercados y mayoristas']);
    if (s.obj === 'aprender' || s.perfil === 'empr') g.push(['/guias/como-importar-a-uruguay/', 'Cómo importar a Uruguay paso a paso']);
    if (g.length < 2) g.push(['/guias/importadora-despachante-o-por-tu-cuenta/', 'Importadora, despachante o por tu cuenta']);
    return g.slice(0, 3);
  }

  function prioridad() {
    var n = 0;
    n += { empresa: 2, distri: 3, marca: 3, empr: 0 }[s.perfil] || 0;
    n += { si: 2, opciones: 1, no: 0 }[s.prov] || 0;
    n += { v1: 1, v2: 2, v3: 3, v4: 4, v0: 0 }[s.vol] || 0;
    if (s.obj === 'lanzar') { n += { si: 3, viene: 2, no: 1 }[s.stock] || 0; n += { uy: 2, afuera: 1, nada: 0 }[s.hoy] || 0; }
    n += { p1: 2, p2: 2, p3: 1, p0: -2 }[s.plazo] || 0;
    return n >= 7 ? 'A' : n >= 4 ? 'B' : 'C';
  }

  function resumen() {
    return STEPS.filter(function (st) { return s[st.id] && (!st.when || st.when(s)); })
      .map(function (st) { return st.q.replace(/[¿?]/g, '') + ': ' + label(st.id); }).join(' | ');
  }

  function result() {
    var sv = servicio(), pr = prioridad();
    bar.style.width = '100%'; count.textContent = 'Tu resultado';
    ga('asesor_resultado', { servicio: sv[2], prioridad: pr, categoria: s.cat });
    var h = '<p class="eyebrow">Lo que te recomendamos</p><h2 class="dx-q" tabindex="-1">' + sv[0] + '</h2><p class="dx-p">' + sv[1] + '</p>';
    var p = puntos();
    if (p.length) h += '<h3 class="dx-h3">Lo que vemos en tu caso</h3><ul class="dx-list">' + p.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
    h += '<h3 class="dx-h3">Para leer antes de hablar</h3><div class="dx-guides">' + guias().map(function (g) { return '<a href="' + g[0] + '">' + g[1] + ' →</a>'; }).join('') + '</div>';
    h += '<div class="dx-cap"><h3 class="dx-h3">Recibí el análisis de tu caso</h3><p class="dx-p">Dejanos tus datos y un especialista te escribe en el día, en horario comercial, con lo que podemos hacer y qué hace falta. Sin compromiso.</p>' +
      '<form id="dx-form" class="lead" novalidate>' +
      '<label>Qué producto es<textarea name="prod" placeholder="Qué es, de dónde viene y cualquier dato que sume"></textarea></label>' +
      '<div class="row"><label>Tu nombre *<input name="nom" type="text" autocomplete="name" required></label>' +
      '<label>Empresa' + (s.perfil === 'empr' ? ' (si tenés)' : ' *') + '<input name="emp" type="text" autocomplete="organization"></label></div>' +
      '<div class="row"><label>WhatsApp *<input name="wa" type="tel" placeholder="099 123 456" autocomplete="tel" required></label>' +
      '<label>Departamento<select name="depto">' + ['Montevideo', 'Canelones', 'Maldonado', 'Colonia', 'San José', 'Salto', 'Paysandú', 'Rivera', 'Tacuarembó', 'Rocha', 'Soriano', 'Florida', 'Lavalleja', 'Durazno', 'Cerro Largo', 'Río Negro', 'Artigas', 'Treinta y Tres', 'Flores', 'Fuera de Uruguay'].map(function (d) { return '<option>' + d + '</option>'; }).join('') + '</select></label></div>' +
      '<label>Correo (opcional)<input name="mail" type="email" autocomplete="email"></label>' +
      '<div class="hp" aria-hidden="true"><label>No completar<input name="web" type="text" tabindex="-1" autocomplete="off"></label></div>' +
      '<span class="err" id="dx-err" role="alert">Necesitamos tu nombre' + (s.perfil === 'empr' ? '' : ', la empresa') + ' y un WhatsApp para responderte.</span>' +
      '<button class="btn dark" type="submit">Quiero el análisis</button>' +
      '<span class="note">Usamos estos datos solo para responderte. <a href="/politica-de-privacidad/"><u>Política de privacidad</u></a>.</span>' +
      '<div class="sent" id="dx-ok" role="status"></div></form></div>' +
      '<button type="button" class="dx-back">← Cambiar respuestas</button>';
    body.innerHTML = h;
    body.querySelector('.dx-q').focus({ preventScroll: true });
    scrollTop();
    body.querySelector('.dx-back').addEventListener('click', function () { hist = []; s = {}; render(0); scrollTop(); });
    var F = document.getElementById('dx-form');
    F.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = function (n) { var el = F.querySelector('[name="' + n + '"]'); return el ? String(el.value || '').trim() : ''; };
      if (v('web')) return;
      var nom = v('nom'), emp = v('emp'), wa = v('wa'), err = document.getElementById('dx-err');
      if (!nom || !wa || (!emp && s.perfil !== 'empr')) { err.classList.add('show'); return; }
      err.classList.remove('show');
      var volTxt = s.obj === 'lanzar' ? ('Stock: ' + label('stock')) : ('Primera compra: ' + label('vol'));
      var d = {
        token: TOKEN, tipo: 'comercio', nombre: nom, comercio: emp || '(emprendedor sin empresa)', telefono: wa, departamento: v('depto'),
        tipo_comercio: 'Asesor .com · Prioridad ' + pr + ' · ' + sv[0],
        volumen: volTxt + ' · Plazo: ' + label('plazo'),
        productos: 'Producto: ' + (v('prod') || '(sin describir)') + ' || ' + resumen() + (v('mail') ? ' || Email: ' + v('mail') : ''),
        origen: 'grupomeridianuy.com' + location.pathname + (document.referrer ? ' ← ' + document.referrer : '')
      };
      try { fetch(URL_SCRIPT, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) })['catch'](function () {}); } catch (e) {}
      ga('generate_lead', { lead_source: 'asesor_com', prioridad: pr, servicio: sv[2], categoria: s.cat });
      var msg = 'Hola, soy ' + nom + (emp ? ' de ' + emp : '') + '. Usé el asesor de la web: ' + sv[0] + '. Producto: ' + (v('prod') || '(te lo cuento por acá)') + '. ' + resumen();
      var ok = document.getElementById('dx-ok'), btn = F.querySelector('button[type=submit]');
      ok.innerHTML = '<b>Recibido, ' + esc(nom) + '.</b> Te escribimos en el día, en horario comercial. Si querés adelantar, <a href="' + WA + '?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">mandanos esto por WhatsApp</a>.';
      ok.classList.add('show'); btn.disabled = true; btn.style.opacity = '.5';
    });
  }

  render(0);
})();
