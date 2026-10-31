/* Grupo Meridian — Calculadora de importación (/calculadora/)
   Tributos de importación a Uruguay sobre el valor CIF (mismas tasas y fuentes que la guía de costos)
   + captura del contacto en la hoja "Leads Grupo Meridian" (Apps Script), igual que el asesor. */
(function () {
  var root = document.getElementById('calc');
  if (!root) return;

  var WA = 'https://wa.me/59893682685';
  var ARANCEL_MAX = 20; // el 99,1 % de las líneas paga 20 % o menos (OMC, 2026)

  var GM = window.GM, ga = GM.ga, esc = GM.esc; // definidos en site.js (se carga antes)
  function el(id) { return document.getElementById(id); }
  function parse(txt) {
    var t = String(txt || '').replace(/usd|u\$s|us\$|\$|%|\s/gi, '');
    if (/[^\d.,]/.test(t)) return 0; // letras o signos: no es un número
    var raw = t;
    if (!raw) return 0;
    var d = raw.lastIndexOf('.'), c = raw.lastIndexOf(',');
    if (d > -1 && c > -1) raw = d > c ? raw.replace(/,/g, '') : raw.replace(/\./g, '').replace(',', '.'); // el último separador es el decimal
    else if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) raw = raw.replace(/[.,]/g, ''); // 1.500 o 1,500 = mil quinientos
    else if ((raw.match(/[.,]/g) || []).length > 1) raw = raw.replace(/[.,]/g, ''); // varios separadores iguales = miles
    else raw = raw.replace(',', '.');
    var n = parseFloat(raw);
    return isFinite(n) && n > 0 ? n : 0;
  }
  function num(id) { return parse(el(id).value); }
  // Avisos por tipo de producto (mismos datos que la guía de habilitaciones)
  var TIPO = {
    gral: '',
    alim: 'Alimentos: se suma la tasa del LATU (0,5 % del CIF; lleva IVA aparte) y el producto necesita registro bromatológico antes de importar. Lácteos, confitería y conservas pueden superar el 20 % de arancel.',
    beb: 'Bebidas: se suma la tasa del LATU (0,5 % del CIF; lleva IVA aparte) y además pagan IMESI, que depende del tipo de bebida y no está incluido acá. Las aguas saborizadas o con azúcar necesitan licencia del MSP.',
    cosm: 'Cosmética y perfumería: algunos productos pagan IMESI (no incluido acá) y todos necesitan registro en el MSP.',
    ropa: 'Ropa: fuera del Mercosur paga 20 % de arancel. La ropa y algunos textiles necesitan licencia de importación del MIEM; lo confirmamos por producto.',
    calz: 'Calzado: fuera del Mercosur paga entre 25 % y 35 % de arancel según el tipo, y tiene su propio trámite de importación en el MIEM.',
    elec: 'Eléctricos: los de baja tensión del reglamento de URSEA necesitan autorización previa con certificado de conformidad.',
    jug: 'Juguetes: necesitan certificado de comercialización del MIEM, con ensayos en LATU o UNIT, antes de venderse.',
    masc: 'Alimento para mascotas: necesita registro en el MGAP. Accesorios e higiene suelen no tener registro específico.',
    veh: 'Vehículos, tabaco y combustibles: pagan IMESI y tienen reglas propias. Esta calculadora no sirve para esos productos: escribinos.'
  };
  function fmt(n) { return 'USD ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function rng(a, b) { return Math.round(a) === Math.round(b) ? fmt(a) : fmt(a) + ' a ' + fmt(b).replace('USD ', ''); }

  var used = false, last = null;

  function calc() {
    var fob = num('c-fob'), flete = num('c-flete'), uds = num('c-uds');
    var consular = el('c-origen').value === 'pref' ? 0.03 : 0.05;
    var iva = el('c-iva').value === 'min' ? 0.10 : 0.22, antIva = iva === 0.10 ? 0.03 : 0.10, antIrae = 0.04;
    var tipo = el('c-tipo').value, pref = el('c-origen').value === 'pref';
    var R = { ropa: [20, 20], calz: [25, 35] }[tipo] || [0, ARANCEL_MAX], min = pref ? 0 : R[0], max = R[1]; // rango si no se sabe el arancel
    var aTxt = String(el('c-arancel').value || '').replace('%', '').trim(), ns = !/\d/.test(aTxt);
    var aNum = Math.min(parse(aTxt), 35), av = ns ? 'ns' : String(aNum);
    var aLo = ns ? min / 100 : aNum / 100, aHi = ns ? max / 100 : aLo;
    var latu = (tipo === 'alim' || tipo === 'beb') ? 0.005 : 0;
    var cif = fob + flete;
    function caso(a) {
      var ar = cif * a, base = cif + ar, tc = cif * consular, lt = cif * latu;
      return { ar: ar, tc: tc, lt: lt, queda: ar + tc + lt, iva: base * iva, aiva: base * antIva, airae: base * antIrae,
        desc: base * (iva + antIva + antIrae), total: ar + tc + lt + base * (iva + antIva + antIrae), puesto: cif + ar + tc + lt };
    }
    var lo = caso(aLo), hi = caso(aHi), out = el('c-out');
    var av2 = el('c-aviso'); av2.textContent = TIPO[tipo] || ''; av2.hidden = !TIPO[tipo] || tipo === 'veh';
    el('c-empty').textContent = tipo === 'veh' ? 'Esta calculadora no sirve para vehículos, tabaco ni combustibles: tienen impuestos y reglas propias. Escribinos y lo vemos.' : 'Escribí el valor de la mercadería para ver el cálculo.';
    if (!fob || tipo === 'veh') { out.hidden = true; el('c-empty').hidden = false; last = null; return; }
    el('c-empty').hidden = true; out.hidden = false;
    var set = function (id, a, b) { el(id).textContent = rng(a, b); };
    set('r-cif', cif, cif);
    set('r-ar', lo.ar, hi.ar);
    set('r-tc', lo.tc, hi.tc);
    set('r-queda', lo.queda, hi.queda);
    set('r-iva', lo.iva, hi.iva);
    set('r-aiva', lo.aiva, hi.aiva);
    set('r-airae', lo.airae, hi.airae);
    set('r-desc', lo.desc, hi.desc);
    set('r-total', lo.total, hi.total);
    set('r-puesto', lo.puesto, hi.puesto);
    el('l-ar').textContent = ns ? (min === max ? 'Arancel (' + max + ' %, habitual en este producto)' : 'Arancel (' + min + ' % a ' + max + ' %, según el producto)') : 'Arancel (' + av.replace('.', ',') + ' %)';
    el('row-latu').hidden = !latu; set('r-latu', lo.lt, hi.lt);
    el('l-tc').textContent = 'Tasa consular (' + (consular * 100) + ' %)';
    el('l-iva').textContent = 'IVA (' + (iva * 100) + ' %)';
    el('l-aiva').textContent = 'Anticipo de IVA (' + (antIva * 100) + ' %)';
    var ru = el('row-ud');
    var dec = function (n) { var p = n.toFixed(2).split('.'); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1]; };
    ru.hidden = !uds;
    if (uds) el('r-ud').textContent = 'USD ' + dec(lo.puesto / uds) + (aLo === aHi ? '' : ' a ' + dec(hi.puesto / uds));
    el('c-sinflete').hidden = !!flete;
    last = { fob: fob, flete: flete, cif: cif, uds: uds, origen: el('c-origen').options[el('c-origen').selectedIndex].text,
      arancel: ns ? 'No lo sé (' + min + '-' + max + ' %)' : av.replace('.', ',') + ' %', tipo: el('c-tipo').options[el('c-tipo').selectedIndex].text, iva: (iva * 100) + ' %',
      queda: rng(lo.queda, hi.queda), total: rng(lo.total, hi.total), puesto: rng(lo.puesto, hi.puesto) };
    // Solo números (sin datos personales) para precargar las herramientas de /herramientas/ en esta pestaña
    try { if (uds) sessionStorage.setItem('gm_calc', JSON.stringify({ puesto: Math.round(hi.puesto / uds * 100) / 100, cif: Math.round(cif), uds: uds })); else sessionStorage.removeItem('gm_calc'); } catch (e) {}
    if (!used) { used = true; ga('calculadora_uso', { arancel: av, origen: el('c-origen').value, tipo: tipo }); }
  }

  ['c-fob', 'c-flete', 'c-uds', 'c-arancel'].forEach(function (id) { el(id).addEventListener('input', calc); });
  ['c-origen', 'c-tipo', 'c-iva'].forEach(function (id) { el(id).addEventListener('change', calc); });
  calc();

  // Captura: costo completo puesto en Uruguay
  var F = el('calc-lead');
  F.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var v = function (n) { var x = F.querySelector('[name="' + n + '"]'); return x ? String(x.value || '').trim() : ''; };
    if (v('web')) return; // honeypot
    var nom = v('nom'), wa = v('wa'), err = el('calc-err');
    if (!nom || !wa) { err.classList.add('show'); return; }
    err.classList.remove('show');
    var c = last, res = c ? ('Mercadería ' + fmt(c.fob) + ' | Flete y seguro ' + (c.flete ? fmt(c.flete) : 'sin indicar') + ' | CIF ' + fmt(c.cif) +
      ' | Tipo: ' + c.tipo + ' | Origen: ' + c.origen + ' | Arancel: ' + c.arancel + ' | IVA: ' + c.iva + (c.uds ? ' | Unidades: ' + c.uds : '') +
      ' | Costo tributario que queda: ' + c.queda + ' | A pagar en el despacho: ' + c.total + ' | Mercadería + tributos que quedan: ' + c.puesto) : '(no llegó a calcular)';
    var d = { tipo: 'comercio', nombre: nom, comercio: v('emp') || '(sin empresa indicada)', telefono: wa, departamento: v('depto'),
      tipo_comercio: 'Calculadora .com · Costo puesto en Uruguay',
      volumen: c ? 'CIF ' + fmt(c.cif) : '(sin calcular)',
      productos: 'Producto: ' + (v('prod') || '(sin describir)') + ' || ' + res + (v('mail') ? ' || Email: ' + v('mail') : ''),
      origen: 'grupomeridianuy.com' + location.pathname + location.search + (document.referrer ? ' ← ' + document.referrer : '') };
    var msg = 'Hola, soy ' + nom + (v('emp') ? ' de ' + v('emp') : '') + '. Usé la calculadora de la web. Producto: ' + (v('prod') || '(te lo cuento por acá)') + '. ' + res;
    var ok = el('calc-ok'), btn = F.querySelector('button[type=submit]');
    btn.disabled = true; btn.style.opacity = '.5';
    GM.enviar(d, function () {
      ga('generate_lead', { envio_id: GM.ultimoEnvio, lead_source: 'calculadora_com', cif: c ? Math.round(c.cif) : 0 });
      ok.innerHTML = '<b>Recibido, ' + esc(nom) + '.</b> Te vamos a escribir por WhatsApp o por correo para pedirte lo que falte y armar el costo completo de tu caso. Si querés adelantar, <a href="' + WA + '?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">mandanos esto por WhatsApp</a>.';
      ok.classList.add('show');
    }, function () {
      GM.fallo(ok, WA + '?text=' + encodeURIComponent(msg));
      btn.disabled = false; btn.style.opacity = '';
    });
  });
  // Detalle del resultado: nombre + WhatsApp o correo, justo debajo del cálculo (mismo canal que el formulario de abajo)
  var S = el('calc-send');
  if (S) S.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var g = function (n) { var x = S.querySelector('[name="' + n + '"]'); return x ? String(x.value || '').trim() : ''; };
    if (g('web')) return; // honeypot
    var nom = g('nom'), ct = g('contacto'), err = el('calc-send-err');
    var esMail = /^[^\s@|]+@[^\s@|]+\.[^\s@|]+$/.test(ct), esTel = !/@/.test(ct) && ct.replace(/\D/g, '').length >= 7 && ct.length <= 40;
    if (!nom || !last || (!esMail && !esTel)) { err.classList.add('show'); return; }
    err.classList.remove('show');
    var c = last;
    var resumen = 'Producto: ' + c.tipo + ' | CIF ' + fmt(c.cif) + ' (mercadería ' + fmt(c.fob) + ', flete y seguro ' + (c.flete ? fmt(c.flete) : 'sin indicar') + ') | Origen: ' + c.origen +
      ' | Arancel: ' + c.arancel + ' | IVA: ' + c.iva + (c.uds ? ' | Unidades: ' + c.uds : '') +
      ' | Impuestos estimados: costo tributario que queda ' + c.queda + ', a pagar en el despacho ' + c.total + ' | Mercadería + tributos que quedan: ' + c.puesto;
    var d = { tipo: 'comercio', nombre: nom, comercio: '(sin empresa) ' + nom.slice(0, 60), telefono: esTel ? ct : '', departamento: '',
      tipo_comercio: 'Calculadora .com · Resultado',
      volumen: 'CIF ' + fmt(c.cif),
      productos: resumen + (esMail ? ' || Email: ' + ct : ''),
      origen: 'grupomeridianuy.com' + location.pathname + location.search + (document.referrer ? ' ← ' + document.referrer : '') };
    var msg = 'Hola, soy ' + nom + '. Usé la calculadora de la web y quiero que revisen mi cálculo. ' + resumen;
    var ok = el('calc-send-ok'), btn = S.querySelector('button[type=submit]');
    btn.disabled = true; btn.style.opacity = '.5';
    GM.enviar(d, function () {
      ga('generate_lead', { envio_id: GM.ultimoEnvio, lead_source: 'calculadora_resultado', cif: Math.round(c.cif) });
      ok.innerHTML = '<b>Listo, ' + esc(nom) + '.</b> ' + (esMail ? 'Te escribimos a ' + esc(ct) + ' con este cálculo.' : 'Te escribimos por WhatsApp con este cálculo.') + ' Si querés adelantar, <a href="' + WA + '?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">mandanos el cálculo por WhatsApp</a>.';
      ok.classList.add('show');
    }, function () {
      GM.fallo(ok, WA + '?text=' + encodeURIComponent(msg));
      btn.disabled = false; btn.style.opacity = '';
    });
  });
})();
