/* Grupo Meridian — Herramientas (/herramientas/<nombre>/)
   Un solo motor para las seis: preguntas con ramas, resultado útil ANTES de pedir ningún dato, y contacto opcional al final
   (botón de WhatsApp sin guardar nada, o nombre + contacto a la hoja "Leads Grupo Meridian", igual que el asesor).
   Información general, no asesoramiento. Los márgenes y umbrales son ejemplos o heurísticas nuestras, nunca datos de mercado. */
(function () {
  var root = document.getElementById('herr');
  if (!root) return;

  var GM = window.GM, ga = GM.ga, esc = GM.esc;
  var WA = 'https://wa.me/59893682685';
  var NAME = root.getAttribute('data-tool');
  var DATA = null;
  try { var dn = document.getElementById('herr-data'); if (dn) DATA = JSON.parse(dn.textContent); } catch (e) {}

  // ---------- utilidades
  // Devuelve un número >= 0, o null si está vacío, tiene letras, signo negativo o es absurdo
  function num(txt) {
    var t = String(txt == null ? '' : txt).replace(/usd|u\$s|us\$|\$|%|\s/gi, '');
    if (!t || /[^\d.,]/.test(t)) return null;
    var raw = t, d = raw.lastIndexOf('.'), c = raw.lastIndexOf(',');
    if (d > -1 && c > -1) raw = d > c ? raw.replace(/,/g, '') : raw.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) raw = raw.replace(/[.,]/g, '');
    else if ((raw.match(/[.,]/g) || []).length > 1) raw = raw.replace(/[.,]/g, '');
    else raw = raw.replace(',', '.');
    var n = parseFloat(raw);
    return isFinite(n) && n >= 0 && n <= 1e9 ? n : null;
  }
  function neg(txt) { return /^\s*-/.test(String(txt || '')); }
  function money(n) {
    if (!isFinite(n)) return '—';
    var d = Math.abs(n) >= 100 ? 0 : 2, p = n.toFixed(d).split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return p.join(',');
  }
  function usd(n) { return 'USD ' + money(n); }
  function pes(n) { return '$ ' + money(n); }
  function pct(n) { return (Math.round(n * 10) / 10).toString().replace('.', ',') + ' %'; }
  function intf(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function dec1(n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); }
  function lab(st, v) { var o = (st.o || []).filter(function (x) { return x[0] === v; })[0]; return o ? o[1] : ''; }
  function saved() { try { var j = JSON.parse(sessionStorage.getItem('gm_calc') || 'null'); return j && j.puesto > 0 ? j : null; } catch (e) { return null; } }

  var TOOLS = {};
  var AVISO = 'Información general a octubre de 2026, no es asesoramiento aduanero ni tributario. Cada producto y cada empresa son distintos: confirmá tu caso con tu despachante y tu contador.';

  // =====================================================================
  // 1. ¿Qué permisos necesita tu producto?
  // =====================================================================
  var G1 = [
    ['comer', 'Para comer o beber', 'Alimentos y bebidas, con o sin alcohol'],
    ['cuid', 'Cuidado personal o limpieza del hogar', 'Cosméticos, perfumes, jabones, desinfectantes'],
    ['masc', 'Para mascotas', 'Alimento, arena, accesorios'],
    ['elec', 'Eléctrico o electrónico', 'Cables, fichas, electrodomésticos, aparatos'],
    ['ropa', 'Ropa, calzado o juguetes', 'Y otros textiles'],
    ['hogar', 'Hogar, bazar, ferretería u otro', 'Todo lo que no entre en los otros']
  ];
  var G2 = {
    comer: [['alim', 'Alimento envasado'], ['beb', 'Bebida sin alcohol'], ['beb_az', 'Bebida con azúcar o saborizada'], ['beb_alc', 'Bebida alcohólica'], ['granel', 'Alimento a granel o fraccionado']],
    cuid: [['cosm', 'Cosmético, perfumería o higiene personal (jabón, shampoo)'], ['limp', 'Limpieza o desinfección del hogar']],
    masc: [['masc_al', 'Alimento para mascotas'], ['masc_ar', 'Arena sanitaria'], ['masc_acc', 'Accesorios o higiene']],
    elec: [['el_lista', 'Ficha, cable, interruptor, prolongador o similar'], ['el_calent', 'Calentador de agua o heladera'], ['el_otro', 'Otro aparato (a pilas, a batería o enchufable)']],
    ropa: [['ropa', 'Ropa'], ['calz', 'Calzado'], ['jug', 'Juguete'], ['textil', 'Otro textil (mantas, sábanas)']],
    hogar: [['bazar', 'Utensilios y bazar'], ['ferr', 'Ferretería'], ['otro', 'Otro']]
  };
  var ALL2 = [].concat.apply([], Object.keys(G2).map(function (k) { return G2[k]; }));
  var CUANDO = { antes_comprar: 'Antes de comprar', antes_embarcar: 'Antes de embarcar o despachar', vender: 'Para vender' };
  var CUANDO_ORD = { antes_comprar: 0, antes_embarcar: 1, vender: 2 };

  function grupo(key) {
    var g = DATA.grupos[key], base = g.hereda ? DATA.grupos[g.hereda] : g;
    var pasos = (base.pasos || []).concat(g.mas || []).map(function (p) { return p; });
    return { l: g.l, pasos: pasos, confirmar: g.confirmar || base.confirmar, src_confirmar: g.src_confirmar, no_verif: g.no_verif || base.no_verif, extra: g.extra || base.extra };
  }
  function fechaLarga(iso) {
    var M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], p = iso.split('-');
    return parseInt(p[2], 10) + ' de ' + M[parseInt(p[1], 10) - 1] + ' de ' + p[0];
  }
  function permisosCalc(s) {
    var g = grupo(s.det), pasos = g.pasos.filter(function (p) { return !(s.reg === 'si' && p.reg); });
    var hadReg = g.pasos.some(function (p) { return p.reg; });
    if (s.reg === 'si' && hadReg) pasos.push({ id: 'cubre', org: 'Tu registro actual', k: 'confirmar que el registro actual cubre a la empresa que va a importar', t: 'Confirmá que el registro que ya tiene el producto cubre a la empresa que vas a usar como importadora.', cuando: 'antes_comprar', c: false });
    pasos = pasos.map(function (p, i) { p.__i = i; return p; }).sort(function (a, b) { return (CUANDO_ORD[a.cuando] - CUANDO_ORD[b.cuando]) || (a.__i - b.__i); });
    var n = pasos.filter(function (p) { return p.c !== false; }).length;
    var nivel = g.confirmar && !n ? 'a_confirmar' : n === 0 ? 'baja' : n <= 2 ? 'media' : 'alta';
    return { g: g, pasos: pasos, n: n, nivel: nivel };
  }

  TOOLS.permisos = {
    titulo: 'Permisos',
    steps: [
      { id: 'grp', q: '¿Qué es tu producto?', o: G1 },
      { id: 'det', q: '¿Y más en concreto?', o: function (s) { return G2[s.grp] || []; } },
      { id: 'imp', q: '¿Qué empresa va a figurar como importadora?', o: [['propia', 'Una empresa mía, con RUT'], ['sin', 'Todavía no tengo empresa'], ['otra', 'Que importe otra empresa por mí'], ['nose', 'No lo sé']] },
      { id: 'reg', q: '¿El producto ya se vende en Uruguay con registro?', o: [['si', 'Sí, ya está registrado'], ['no', 'No, es nuevo para Uruguay'], ['nose', 'No lo sé']] },
      { id: 'ncm', q: '¿Ya tenés el código arancelario (NCM) del producto?', o: [['si', 'Sí'], ['no', 'No'], ['nose', 'No sé qué es']] }
    ],
    result: function (s) {
      var c = permisosCalc(s), g = c.g, V = DATA.verificado_largo;
      var primero = c.pasos.filter(function (p) { return p.cuando === 'antes_comprar'; })[0] || c.pasos[0];
      var h = '<p class="eyebrow">Tu resultado</p>';
      if (primero) h += '<h2 class="dx-q" tabindex="-1">Para ' + g.l + ', lo primero que tenés que resolver es ' + primero.k + '.</h2><p class="dx-p">Conviene tenerlo claro antes de pagarle al proveedor.</p>';
      else h += '<h2 class="dx-q" tabindex="-1">Para ' + g.l + ', lo primero es confirmar si hace falta algún trámite.</h2><p class="dx-p">Conviene tenerlo claro antes de pagarle al proveedor.</p>';
      var cargaTxt = c.nivel === 'a_confirmar' ? 'a confirmar (no encontramos un trámite específico)' : c.nivel + ' (' + c.n + (c.n === 1 ? ' paso ante organismos)' : ' pasos ante organismos)');
      h += '<p class="hr-carga">Carga de trámites: <b>' + cargaTxt + '</b></p>';
      if (c.pasos.length) {
        h += '<h3 class="dx-h3">Tu lista, en orden</h3><ol class="hr-list">';
        c.pasos.forEach(function (p) {
          var src = p.src ? DATA.fuentes[p.src] : null, ver = p.ver || (src && src.ver) || '';
          h += '<li><span class="hr-tag">' + CUANDO[p.cuando] + '</span><b>' + esc(p.org) + '</b> ' + esc(p.t) +
            (src ? ' <a href="' + src.u + '" target="_blank" rel="noopener">Fuente oficial</a>' : '') + (ver ? ' <i>Verificado el ' + fechaLarga(ver) + '.</i>' : '') + '</li>';
        });
        h += '</ol>';
      }
      if (g.confirmar) {
        var sc = g.src_confirmar ? DATA.fuentes[g.src_confirmar] : null;
        h += '<p class="hr-conf"><b>Lo que no pudimos confirmar.</b> ' + esc(g.confirmar) + (sc ? ' <a href="' + sc.u + '" target="_blank" rel="noopener">Fuente consultada</a>' : '') + '</p>';
      }
      if (g.no_verif) h += '<p class="hr-conf"><b>Lo que no pudimos confirmar.</b> ' + esc(g.no_verif) + '</p>';
      if (g.extra) h += '<p class="dx-p">' + esc(g.extra) + '</p>';
      var imp = { propia: 'Con empresa propia, los trámites van a nombre de tu empresa.', sin: 'Primero hace falta tener la empresa inscrita en el RUT.', otra: 'Los trámites van a nombre de quien figure como importador; lo vemos en tu caso.', nose: 'Conviene definir primero qué empresa va a figurar como importadora: de eso depende quién tramita qué.' }[s.imp];
      h += '<p class="dx-p">' + imp + '</p>';
      if ((s.ncm === 'no' || s.ncm === 'nose') && s.det !== 'masc_ar') h += '<p class="dx-p">El código arancelario define cuánto arancel paga el producto y si necesita algún permiso. Lo confirma tu despachante antes de comprar.</p>';
      h += '<p class="dx-p"><b>También tenés que tener:</b> RUT activo en DGI, registro en VUCE (se hace una vez) y un despachante de aduana, que es obligatorio para importar. Si querés la preferencia arancelaria de un origen, hace falta certificado de origen.</p>';
      if (c.nivel === 'alta') h += '<p class="dx-p"><b>Se puede, pero el orden importa:</b> conviene resolver estos trámites antes de pagar. Si querés, vemos juntos cuál es la forma más sencilla de arrancar en tu caso. Analizamos tu caso sin costo.</p>';
      var pts = ({ propia: 2, otra: 1, sin: 0, nose: 0 }[s.imp] || 0) + (s.reg === 'si' ? 1 : 0) + (s.ncm === 'si' ? 1 : 0) + ((c.nivel === 'media' || c.nivel === 'alta') ? 1 : 0);
      var resumenTxt = 'Producto: ' + g.l + ' | Carga de trámites: ' + (c.nivel === 'a_confirmar' ? 'a confirmar' : c.nivel + ' (' + c.n + ' pasos)') + (primero ? ' | Primer paso: ' + primero.k : '');
      return {
        h: h, nivel: c.nivel, cat: s.det, verif: 'Verificado el ' + V + '.',
        wa: 'Esto me dio la herramienta de permisos de Grupo Meridian. ' + resumenTxt + '. Verificado el ' + V + '. Información general, no asesoramiento.',
        sheet: { tc: 'Carga ' + (c.nivel === 'a_confirmar' ? 'a confirmar' : c.nivel) + ' · ' + g.l, vol: 'Carga: ' + (c.nivel === 'a_confirmar' ? 'a confirmar' : c.nivel + ' (' + c.n + (c.n === 1 ? ' paso)' : ' pasos)')),
          det: 'Grupo: ' + lab(TOOLS.permisos.steps[0], s.grp) + ' | Detalle: ' + g.l + ' | Importador: ' + lab(TOOLS.permisos.steps[2], s.imp) + ' | Registro en UY: ' + lab(TOOLS.permisos.steps[3], s.reg) + ' | NCM: ' + lab(TOOLS.permisos.steps[4], s.ncm) + ' || ' + resumenTxt },
        prio: pts >= 4 ? 'A' : pts >= 2 ? 'B' : 'C',
        next: [['/calculadora/', 'Calcular los impuestos', 'calculadora'], ['/herramientas/precio-en-gondola/', 'Ver el precio en góndola', 'otra_herramienta'], ['/guias/habilitaciones-para-importar-en-uruguay/', 'Guía de habilitaciones', 'guia']]
      };
    }
  };

  // =====================================================================
  // 3 (en el orden de construcción, la 2.ª). Precio de venta en góndola
  // =====================================================================
  var CFG_G = { comercioMin: 15, arribaPct: 30 }; // umbrales provisorios de los avisos (no son datos de mercado)
  var EJ = '<small>Valores de ejemplo para que veas la cuenta. No son márgenes de Grupo Meridian ni «los del mercado»: poné los que te pidan.</small>';
  TOOLS.gondola = {
    titulo: 'Precio en góndola',
    steps: [
      { id: 'modo', q: '¿Qué querés saber?', o: [['dir', 'Desde mi costo, a qué precio llega a la góndola'], ['inv', 'Desde el precio que quiero en góndola, cuánto puedo pagar por unidad']] },
      { id: 'costo', q: '¿Cuánto te cuesta cada unidad puesta en Uruguay?', when: function (s) { return s.modo === 'dir'; }, type: 'fields',
        fields: [{ id: 'costo', label: 'Costo por unidad, en USD', ph: '2,50', hint: 'Mercadería más flete, arancel y tasa consular, sin IVA. La calculadora te lo da si cargás las unidades.' }],
        usar: true,
        check: function (s) { return fnum(s.costo, 'el costo por unidad', true); } },
      { id: 'precio', q: '¿A qué precio querés que esté en la góndola?', when: function (s) { return s.modo === 'inv'; }, type: 'fields',
        fields: [{ id: 'goin', label: 'Precio en góndola, con IVA incluido, en pesos', ph: '189', hint: 'Lo que paga la persona en la caja.' },
          { id: 'tc', label: 'Cotización del dólar (pesos por USD)', ph: '40', hint: 'Poné la del día; la usamos para pasar a dólares.' }],
        check: function (s) { return fnum(s.goin, 'el precio en góndola', true) || fnum(s.tc, 'la cotización del dólar', true); } },
      { id: 'contri', q: '¿Sos contribuyente de IVA?', o: [['si', 'Sí'], ['no', 'No'], ['nose', 'No sé']] },
      { id: 'canal', q: '¿Por qué canal llega?', o: [['dir', 'Directo a almacenes o comercios'], ['dis', 'A través de una distribuidora'], ['cad', 'A una cadena de supermercados'], ['discad', 'Distribuidora y luego cadena']] },
      { id: 'mar', q: '¿Qué margen se queda cada eslabón?', type: 'fields',
        fields: [
          { id: 'm1', label: 'Tu margen (importador o marca), %', def: '30', ph: '30', hint: EJ },
          { id: 'm2', label: 'Margen de la distribuidora, %', def: '15', ph: '15', when: function (s) { return s.canal === 'dis' || s.canal === 'discad'; } },
          { id: 'm3', label: function (s) { return s.canal === 'cad' || s.canal === 'discad' ? 'Margen de la cadena, %' : 'Margen del comercio, %'; }, def: '25', ph: '25', hint: '<small>Es margen sobre el precio de venta: si el comercio vende a 100 y se queda con 25, su margen es 25 %. No es lo mismo que un recargo sobre el costo; abajo te mostramos los dos.</small>' },
          { id: 'iva', label: 'IVA del producto', kind: 'sel', def: '22', opts: [['22', '22 % (la mayoría)'], ['10', '10 % (tasa mínima)']], hint: '<small>La tasa de tu producto la confirmás en la guía de IVA: algunos alimentos llevan la mínima.</small>' }
        ],
        check: function (s) { return fmar(s.m1, 'tu margen') || (hasDis(s) ? fmar(s.m2, 'el margen de la distribuidora') : '') || fmar(s.m3, 'el margen del comercio'); } },
      { id: 'opc', q: 'Si querés, afinamos la cuenta', type: 'fields', optional: true,
        fields: [
          { id: 'tc2', label: 'Cotización del dólar, para ver el precio en pesos (opcional)', ph: '40', when: function (s) { return s.modo === 'dir'; } },
          { id: 'par', label: 'Precio en góndola de un producto parecido, en pesos, con IVA (opcional)', ph: '189', hint: '<small>Para comparar. Necesita la cotización del dólar.</small>' },
          { id: 'uds', label: 'Unidades que pensás vender por mes (opcional)', ph: '500', when: function (s) { return s.modo === 'dir'; } }
        ],
        check: function (s) { return fnum(s.tc2, 'la cotización', false) || fnum(s.par, 'el precio parecido', false) || fnum(s.uds, 'las unidades', false); } }
    ],
    result: function (s) {
      var dir = s.modo === 'dir', iva = parseInt(s.iva || '22', 10) / 100, hd = hasDis(s);
      var m1 = Math.min(num(s.m1) || 0, 90) / 100, m2 = hd ? Math.min(num(s.m2) || 0, 90) / 100 : 0, m3 = Math.min(num(s.m3) || 0, 90) / 100;
      var tc = dir ? num(s.tc2) : num(s.tc), par = num(s.par), uds = num(s.uds), sv = saved();
      var rec = function (m) { return m / (1 - m); };
      var rows, costo, pm, pd, pc, pg, h = '<p class="eyebrow">Tu resultado</p>';
      if (dir) {
        costo = num(s.costo); pm = costo / (1 - m1); pd = hd ? pm / (1 - m2) : pm; pc = pd / (1 - m3); pg = pc * (1 + iva);
        h += '<h2 class="dx-q" tabindex="-1">Con estos números, tu producto llega a la góndola a ' + usd(pg) + (tc ? ' (' + pes(pg * tc) + ')' : '') + ', IVA incluido.</h2>';
      } else {
        pg = num(s.goin) / num(s.tc); pc = pg / (1 + iva); pd = pc * (1 - m3); pm = hd ? pd * (1 - m2) : pd; costo = pm * (1 - m1);
        h += '<h2 class="dx-q" tabindex="-1">Para llegar a ' + pes(num(s.goin)) + ' en la góndola, podés pagar hasta ' + usd(costo) + ' por unidad puesta en Uruguay.</h2>';
      }
      h += '<p class="dx-p">Con los márgenes que cargaste vos, no con una referencia del mercado.</p>';
      rows = [['Tu costo puesto en Uruguay', '', costo], ['Tu precio de venta', m1, pm]];
      if (hd) rows.push(['Precio de la distribuidora', m2, pd]);
      rows.push([s.canal === 'cad' || s.canal === 'discad' ? 'Precio de la cadena' : 'Precio del comercio', m3, pc]);
      rows.push(['Góndola, con IVA ' + Math.round(iva * 100) + ' %', '', pg]);
      h += '<h3 class="dx-h3">Así se arma el precio</h3><table class="hr-tab"><thead><tr><th>Eslabón</th><th>Margen que usaste</th><th>Precio por unidad</th></tr></thead><tbody>' +
        rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + (r[1] === '' ? '' : pct(r[1] * 100)) + '</td><td>' + usd(r[2]) + '</td></tr>'; }).join('') + '</tbody></table>';
      h += '<p class="dx-p"><b>Un dato para no confundirte:</b> un margen de ' + pct(m1 * 100) + ' sobre el precio equivale a un recargo de ' + pct(rec(m1) * 100) + ' sobre el costo' +
        (hd ? '; el de la distribuidora (' + pct(m2 * 100) + '), a ' + pct(rec(m2) * 100) + '' : '') + '; ' + (s.canal === 'cad' || s.canal === 'discad' ? 'el de la cadena' : 'el del comercio') + ' (' + pct(m3 * 100) + '), a ' + pct(rec(m3) * 100) + '.</p>';
      if (s.contri === 'si') h += '<p class="dx-p">Como sos contribuyente de IVA, el IVA que pagás al importar no es costo: se descuenta del IVA de tus ventas. Usá tu costo sin IVA.</p>';
      else if (s.contri === 'no') h += '<p class="dx-p">Si no sos contribuyente de IVA, el IVA de importación sí es un costo para vos: sumalo a tu costo por unidad antes de hacer la cuenta.</p>';
      else h += '<p class="dx-p">Si sos contribuyente de IVA, el IVA que pagás al importar no es costo: se descuenta de tus ventas. Si no lo sos, sí lo es y tenés que sumarlo a tu costo. <a href="/guias/costos-de-importar-a-uruguay/">Mirá la guía de costos</a>.</p>';
      var av = [];
      if (m3 * 100 < CFG_G.comercioMin) av.push('Con ese margen es difícil que un comercio lo tome: revisalo con el comprador.');
      if (par) {
        if (!tc) av.push('Para comparar con el producto parecido necesitamos la cotización del dólar.');
        else {
          var mio = pg * tc, r = mio / par;
          if (r > 1 + CFG_G.arribaPct / 100) av.push('Quedás bastante arriba de lo parecido (' + pes(mio) + ' contra ' + pes(par) + '): ¿qué lo justifica?');
          else if (r > 1.1) av.push('Quedás por encima de lo parecido (' + pes(mio) + ' contra ' + pes(par) + ').');
          else if (r < 0.9) av.push('Quedás por debajo de lo parecido (' + pes(mio) + ' contra ' + pes(par) + '): revisá que te quede margen.');
          else av.push('Quedás en línea con lo parecido (' + pes(mio) + ' contra ' + pes(par) + ').');
        }
      }
      if (!dir && sv) {
        av.push('Tu cálculo de la calculadora da ' + usd(sv.puesto) + ' por unidad: ' + (sv.puesto <= costo ? 'entra dentro de lo que podés pagar.' : 'queda por encima de lo que podés pagar para llegar a ese precio.'));
      }
      if (av.length) h += '<ul class="dx-list">' + av.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
      if (dir && uds) h += '<p class="dx-p">Con ' + intf(uds) + ' unidades por mes, la diferencia entre tu precio de venta y tu costo es de ' + usd((pm - costo) * uds) + ' por mes, antes de gastos, impuestos, descuentos y devoluciones.</p>';
      h += '<p class="dx-p"><b>Lo que esta cuenta no incluye:</b> los gastos de despacho, puerto y transporte interno si no los pusiste en el costo; y los descuentos por volumen, devoluciones, promociones y plazos de pago, que cada comprador define.</p>';
      var pts = (s.contri === 'si' ? 2 : 0) + (s.canal !== 'dir' ? 1 : 0) + (dir && sv && Math.abs(sv.puesto - costo) < 0.005 ? 2 : 0) + (uds ? 1 : 0);
      var canalL = lab(TOOLS.gondola.steps[4], s.canal);
      return {
        h: h, nivel: 'calculado', cat: s.canal,
        wa: 'Esto me dio la herramienta de precio en góndola de Grupo Meridian. ' + (dir ? 'Costo ' + usd(costo) + ' por unidad, góndola ' + usd(pg) + ' con IVA' : 'Para ' + pes(num(s.goin)) + ' en góndola, costo máximo ' + usd(costo)) +
          ' | Márgenes que cargué: tuyo ' + pct(m1 * 100) + (hd ? ', distribuidora ' + pct(m2 * 100) : '') + ', comercio ' + pct(m3 * 100) + ' | Canal: ' + canalL + '. Los márgenes son los que cargué yo, no una referencia del mercado.',
        sheet: { tc: canalL, vol: 'Costo unit. ' + usd(costo) + ' · Unid./mes: ' + (uds ? intf(uds) : 'sin indicar'),
          det: 'Modo: ' + lab(TOOLS.gondola.steps[0], s.modo) + ' | Canal: ' + canalL + ' | Márgenes cargados: ' + pct(m1 * 100) + (hd ? ' / ' + pct(m2 * 100) : '') + ' / ' + pct(m3 * 100) + ' | IVA producto: ' + Math.round(iva * 100) + ' % | Contribuyente: ' + lab(TOOLS.gondola.steps[3], s.contri) + ' || Góndola: ' + usd(pg) },
        prio: pts >= 5 ? 'A' : pts >= 3 ? 'B' : 'C',
        extra: tc ? 'cambio' : '',
        next: [['/herramientas/importar-o-comprar-local/', 'Importar o comprar local', 'otra_herramienta'], ['/herramientas/cuanto-comprar-primera-vez/', '¿Cuánto comprar la primera vez?', 'otra_herramienta'], ['/calculadora/', 'Calculadora de impuestos', 'calculadora']]
      };
    }
  };
  function hasDis(s) { return s.canal === 'dis' || s.canal === 'discad'; }
  // Validadores: devuelven '' si está bien, o el mensaje de error
  function fnum(v, que, req) {
    if (!v || !String(v).trim()) return req ? 'Escribí ' + que + '.' : '';
    if (neg(v)) return 'No puede ser negativo (' + que + ').';
    var n = num(v);
    return n === null || n === 0 ? 'Escribí un número mayor a cero en ' + que + '.' : '';
  }
  function fmar(v, que) {
    var n = num(v);
    if (neg(v)) return 'No puede ser negativo (' + que + ').';
    if (n === null) return 'Escribí ' + que + ' como número, por ejemplo 25.';
    return n >= 90 ? 'Un margen de 90 % o más no es una cuenta realista (' + que + '). Poné un valor menor.' : '';
  }

  // =====================================================================
  // 2. ¿Funcionaría tu producto en Uruguay?  (heurística nuestra, no estadística)
  // =====================================================================
  var VIA_D = { comer: 0, cuid: 0, masc: 1, elec: 1, ropa: 1, hogar: 1 }; // trámites: 0 = carga alta, 1 = media o a confirmar (ver «Permisos»)
  var VIA_S = [['A', 'Demanda comprobada'], ['B', 'Motivo para elegirlo'], ['C', 'Encaje con el canal'], ['D', 'Trámites'], ['E', 'Primera compra']];
  TOOLS.viabilidad = {
    titulo: 'Viabilidad',
    steps: [
      { id: 'grp', q: '¿Qué tipo de producto es?', o: G1 },
      { id: 'par', q: '¿Qué pasa hoy con productos parecidos en Uruguay?', o: [['varias', 'Hay varias marcas en góndola'], ['pocas', 'Hay una o dos'], ['nada', 'No vi nada parecido'], ['nose', 'No lo sé']] },
      { id: 'prec', q: 'Comparado con lo parecido, tu precio al público sería…', o: [['bajo', 'Más bajo'], ['igual', 'Parecido'], ['alto', 'Más alto'], ['nose', 'No lo sé, o no hay referencia']] },
      { id: 'dif', q: '¿Qué lo hace distinto de lo que ya hay?', o: [['precio', 'Su precio'], ['calidad', 'Calidad o ingredientes'], ['formato', 'Formato, tamaño o presentación'], ['novedad', 'Es una novedad'], ['nada', 'Todavía nada especial']] },
      { id: 'canal', q: '¿Por dónde arrancarías?', o: [['alm', 'Almacenes y comercios chicos'], ['dis', 'Distribuidoras o mayoristas'], ['sup', 'Supermercados'], ['onl', 'Venta online'], ['nose', 'No lo sé']] },
      { id: 'inv', q: '¿Cuánto pensás invertir en la primera compra?', optional: true, o: [['v1', 'Menos de USD 5.000'], ['v2', 'USD 5.000 a 20.000'], ['v3', 'USD 20.000 a 50.000'], ['v4', 'Más de USD 50.000'], ['v0', 'Prefiero no decirlo']] }
    ],
    form: { id: 'perfil', label: 'Quién sos (opcional)', opts: [['', 'Prefiero no decirlo'], ['emp', 'Empresa o comercio con RUT'], ['mar', 'Distribuidora o marca'], ['sin', 'Emprendedor, todavía sin empresa']] },
    result: function (s) {
      var d = {}, dif = s.dif, claro = dif === 'calidad' || dif === 'formato' || dif === 'novedad';
      d.A = ({ varias: [2, 'Hay varias marcas: el producto se compra. La contracara es que vas a competir.'], pocas: [1, 'Hay poca oferta: puede ser un hueco o poca demanda. No lo podemos saber desde acá.'], nada: [0, 'Nada parecido en góndola no prueba que haya demanda. Conviene probarlo en chico antes de una compra grande.'] })[s.par] || null;
      if (s.prec === 'nose') d.B = null;
      else if (claro && (s.prec === 'bajo' || s.prec === 'igual')) d.B = [2, 'Tenés un motivo para que te elijan: un precio que compite y algo que te distingue.'];
      else if (claro && s.prec === 'alto' && (dif === 'calidad' || dif === 'novedad')) d.B = [1, 'Con un precio más alto, el comprador tiene que ver el motivo. Probalo con un comprador antes de comprar en grande.'];
      else if (s.prec === 'bajo') d.B = [1, 'Competir solo por precio deja poco margen para vos y para el comercio. Calculalo en la herramienta de precio en góndola.'];
      else if (s.prec === 'alto') d.B = [0, 'Con un precio más alto y sin algo que lo distinga, cuesta que el comprador lo elija.'];
      else d.B = [0, 'Si es parecido en precio y no se distingue, el comprador no tiene motivo para cambiar.'];
      if (s.canal === 'alm' || s.canal === 'dis') d.C = [2, 'Distribuidoras y almacenes son buena puerta para un producto nuevo: llegan a muchos puntos y dan datos de rotación.'];
      else if (s.canal === 'onl') d.C = [1, 'La venta online permite probar sin depender de un comprador, aunque llegás a menos gente de golpe.'];
      else if (s.canal === 'sup' && s.par !== 'nada' && claro) d.C = [1, 'Las cadenas piden rotación demostrada o una propuesta clara para la categoría: tu diferencial ayuda, pero conviene llegar con datos.'];
      else if (s.canal === 'sup') d.C = [0, 'Las cadenas piden rotación demostrada o una propuesta clara para la categoría. Sin eso conviene empezar en un canal más chico.'];
      else d.C = [1, 'Todavía no tenés un canal definido: es lo primero que conviene decidir.'];
      d.D = VIA_D[s.grp] === 0 ? [0, 'Hay varios trámites antes de poder vender. No lo hace inviable, pero suma pasos y costos antes del primer ingreso.'] : [1, 'Según el producto, puede haber trámites antes de poder vender. Miralos en la herramienta de permisos.'];
      var alta = VIA_D[s.grp] === 0;
      if (!s.inv || s.inv === 'v0') d.E = null;
      else if (s.inv === 'v1') d.E = alta ? [0, 'Con una compra chica y varios trámites antes de vender, la cuenta cierra más justa: conviene empezar probando en chico.'] : [1, 'Con una compra chica conviene consolidar: tu carga viaja dentro de un contenedor compartido y por unidad sale más que en un contenedor lleno.'];
      else d.E = [2, 'Con una primera compra de ese tamaño podés probar en más de un canal.'];
      var keys = ['A', 'B', 'C', 'D', 'E'], con = keys.filter(function (k) { return d[k]; }), suma = con.reduce(function (a, k) { return a + d[k][0]; }, 0), ratio = suma / (2 * con.length);
      var conf = con.length >= 4 ? 'alta' : con.length === 3 ? 'media' : 'baja';
      var nivel = conf === 'baja' ? 'sin_nivel' : ratio >= 0.75 ? 'buen' : ratio >= 0.5 ? 'potencial' : ratio >= 0.25 ? 'validar' : 'probar';
      var NT = { buen: 'Buen punto de partida', potencial: 'Tiene potencial, con puntos para resolver', validar: 'Conviene validarlo antes de comprar', probar: 'Hoy conviene probar antes de importar', sin_nivel: 'Con lo que sabés hoy no alcanza para opinar' };
      var ord = con.slice().sort(function (a, b) { return d[b][0] - d[a][0] || keys.indexOf(a) - keys.indexOf(b); });
      var fav = ord.filter(function (k) { return d[k][0] === 2; }).slice(0, 2);
      var cont = con.slice().sort(function (a, b) { return d[a][0] - d[b][0] || keys.indexOf(a) - keys.indexOf(b); }).filter(function (k) { return d[k][0] <= 1 && fav.indexOf(k) < 0 || d[k][0] === 0; }).slice(0, 2);
      var nulos = (s.par === 'nose' ? 1 : 0) + (s.prec === 'nose' ? 1 : 0) + (s.canal === 'nose' ? 1 : 0);
      var h = '<p class="eyebrow">Tu resultado</p><h2 class="dx-q" tabindex="-1">' + NT[nivel] + '</h2>';
      h += '<p class="dx-p">Confianza del resultado: <b>' + (conf === 'baja' ? 'baja' : conf) + '</b>. ' + (nulos ? 'Dejaste ' + nulos + (nulos === 1 ? ' respuesta' : ' respuestas') + ' en «no sé»: abajo está qué averiguar. ' : '') + 'Es una guía de orden, no una predicción de ventas.</p>';
      if (nivel === 'sin_nivel') {
        var av = [];
        if (s.par === 'nose') av.push('Cuántas marcas parecidas hay en góndola: recorré dos o tres supermercados y almacenes.');
        if (s.prec === 'nose') av.push('A qué precio se vende lo parecido, para saber si quedás más arriba o más abajo.');
        if (s.canal === 'nose') av.push('Por dónde arrancarías: almacenes, una distribuidora, venta online o una cadena. De eso dependen el precio y el tamaño de la primera compra.');
        if (!av.length) av.push('Conseguí una señal de un comprador real: una muestra, un pedido de prueba o una consulta a una distribuidora.');
        h += '<h3 class="dx-h3">Lo que conviene averiguar primero</h3><ul class="dx-list">' + av.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
      } else {
        h += '<h3 class="dx-h3">Lo que juega a favor</h3>' + (fav.length ? '<ul class="dx-list">' + fav.map(function (k) { return '<li>' + d[k][1] + '</li>'; }).join('') + '</ul>' : '<p class="dx-p">Con lo que respondiste, nada juega claramente a favor todavía.</p>');
        h += '<h3 class="dx-h3">Lo que más pesa en contra</h3>' + (cont.length ? '<ul class="dx-list">' + cont.map(function (k) { return '<li>' + d[k][1] + '</li>'; }).join('') + '</ul>' : '<p class="dx-p">No vemos puntos en contra claros con lo que respondiste.</p>');
      }
      var prueba = { alm: 'pedir una muestra a dos o tres almacenes', dis: 'consultar a una distribuidora si lo tomaría', onl: 'publicarlo en venta online', sup: 'consultar a una distribuidora o a un almacén grande antes de ir a una cadena', nose: 'pedir una muestra a dos o tres almacenes' }[s.canal];
      h += '<h3 class="dx-h3">Lo que esta herramienta no sabe</h3><p class="dx-p">No conocemos la demanda de tu producto, los precios actuales de góndola ni lo que pide cada comprador. Son datos que se consiguen con una prueba chica: ' + prueba + '.</p>';
      h += '<h3 class="dx-h3">Cómo probarlo sin apostar de más</h3><p class="dx-p">' + (nivel === 'buen' || nivel === 'potencial' ? 'Empezá por un lote chico en almacenes y distribuidoras de una zona y mirá cuánto rota antes de ir a una cadena.' : 'Antes de una compra grande, conseguí una señal de un comprador real: una muestra, un pedido de prueba o una consulta a una distribuidora. Analizamos tu caso sin costo.') + '</p>';
      h += '<table class="hr-tab"><caption class="hr-nota" style="text-align:left;padding:0 0 6px">Cómo salió cada punto (0 a 2; «—» es que no sabés)</caption><tbody>' + VIA_S.map(function (x) { return '<tr><td>' + x[1] + '</td><td>' + (d[x[0]] ? d[x[0]][0] + ' de 2' : '—') + '</td></tr>'; }).join('') + '</tbody></table>';
      var grpL = lab(TOOLS.viabilidad.steps[0], s.grp), canalL = lab(TOOLS.viabilidad.steps[4], s.canal);
      var pts = d.A ? '' : '';
      var det = 'Grupo: ' + grpL + ' | Parecidos: ' + lab(TOOLS.viabilidad.steps[1], s.par) + ' | Precio vs parecido: ' + lab(TOOLS.viabilidad.steps[2], s.prec) + ' | Diferencial: ' + lab(TOOLS.viabilidad.steps[3], s.dif) + ' | Canal: ' + canalL +
        ' || Nivel: ' + NT[nivel] + ', confianza: ' + conf + ', puntos: ' + keys.map(function (k) { return k + (d[k] ? d[k][0] : '-'); }).join(' ');
      var base = ({ buen: 3, potencial: 2, validar: 1, probar: 0, sin_nivel: 1 })[nivel] + (({ v2: 2, v3: 2, v4: 2, v1: 1 })[s.inv] || 1) + ((s.canal === 'sup' || s.canal === 'dis') ? 1 : 0);
      return {
        h: h, nivel: nivel, conf: conf, cat: s.grp,
        wa: 'Esto me dio la herramienta «¿Funcionaría tu producto en Uruguay?» de Grupo Meridian: ' + NT[nivel] + ' (confianza ' + conf + '). ' + grpL + ' | Canal: ' + canalL + '. Es una guía de orden, no una predicción de ventas.',
        sheet: { tc: NT[nivel], vol: '1ª compra: ' + (s.inv && s.inv !== 'v0' ? lab(TOOLS.viabilidad.steps[5], s.inv) : 'no indicó') + ' · Canal: ' + canalL, det: det },
        base: base, prio: base >= 7 ? 'A' : base >= 4 ? 'B' : 'C',
        next: [['/herramientas/que-permisos-necesita-tu-producto/', 'Permisos de tu producto', 'otra_herramienta'], ['/herramientas/precio-en-gondola/', 'Precio en góndola', 'otra_herramienta'], ['/herramientas/listo-para-supermercados/', '¿Listo para supermercados?', 'otra_herramienta']]
      };
    },
    prioForm: function (r, pv) { var b = r.base + ({ emp: 2, mar: 3, sin: 0 }[pv] != null ? { emp: 2, mar: 3, sin: 0 }[pv] : 1); return b >= 7 ? 'A' : b >= 4 ? 'B' : 'C'; }
  };

  // =====================================================================
  // 4. ¿Estás listo para vender en supermercados?
  // =====================================================================
  var SUP_L = ['reg', 'etiq', 'barras', 'fact', 'repo', 'prec'];
  TOOLS.super = {
    titulo: 'Supermercados',
    steps: [
      { id: 'reg', q: '¿Tu producto está registrado o habilitado, si le corresponde?', o: [['si', 'Sí'], ['na', 'No hace falta, no es de los que lo piden'], ['no', 'No, falta'], ['nose', 'No sé']] },
      { id: 'etiq', q: '¿Tiene la etiqueta en español con los datos obligatorios?', o: [['si', 'Sí', 'Y los octógonos, si es alimento envasado y los necesita.'], ['falta', 'Falta algo'], ['no', 'No'], ['nose', 'No sé']] },
      { id: 'barras', q: '¿Tiene código de barras?', o: [['gs1', 'Sí, de GS1 Uruguay (empieza con 773)'], ['ext', 'Sí, el del fabricante del exterior'], ['no', 'No'], ['nose', 'No sé']] },
      { id: 'fact', q: '¿Quién factura?', o: [['emp', 'Una empresa con RUT que emite factura electrónica', 'La factura electrónica es obligatoria desde 2025 para los contribuyentes de IVA, con algunas excepciones.'], ['mono', 'Un monotributista o similar'], ['sin', 'Todavía no hay empresa'], ['nose', 'No sé']] },
      { id: 'repo', q: '¿Podés reponer sin cortes lo que te pidan?', o: [['si', 'Sí, tengo stock y logística'], ['stock', 'Tengo stock, pero no logística propia'], ['imp', 'Cada reposición depende de una importación'], ['nose', 'No lo sé']] },
      { id: 'prec', q: '¿Ya sabés a qué precio quedaría en la góndola y cuánto margen le dejás al comercio?', optional: true, o: [['si', 'Sí'], ['no', 'No']] }
    ],
    result: function (s) {
      var sc = {
        reg: ({ si: 2, na: 2, no: 0 })[s.reg], etiq: ({ si: 2, falta: 1, no: 0 })[s.etiq], barras: ({ gs1: 2, ext: 1, no: 0 })[s.barras],
        fact: ({ emp: 2, mono: 1, sin: 0 })[s.fact], repo: ({ si: 2, stock: 1, imp: 0 })[s.repo], prec: ({ si: 2, no: 0 })[s.prec]
      };
      SUP_L.forEach(function (k) { if (sc[k] == null) sc[k] = -1; }); // -1 = a confirmar
      function veredicto(ks) {
        var no2 = ks.filter(function (k) { return sc[k] !== 2; }), ceros = ks.filter(function (k) { return sc[k] === 0; });
        return !no2.length ? 'listo' : (!ceros.length && no2.length <= 1) ? 'casi' : 'falta';
      }
      var vd = veredicto(['reg', 'etiq', 'repo', 'prec']), vc = veredicto(SUP_L);
      var VT = { listo: 'listo', casi: 'casi listo', falta: 'te faltan cosas' };
      var PEN = {
        reg: function () { return s.reg === 'no' ? ['Registro o habilitación del producto', 'Antes de pagarle al proveedor, confirmá qué organismo corresponde a tu producto.', '/herramientas/que-permisos-necesita-tu-producto/', 'Ver permisos de tu producto'] : ['Registro o habilitación del producto', 'Confirmá si tu producto necesita registro o habilitación.', '/herramientas/que-permisos-necesita-tu-producto/', 'Ver permisos de tu producto']; },
        etiq: function () { return ['Etiqueta en español', s.etiq === 'nose' ? 'Revisá que tu etiqueta tenga los datos obligatorios en español (Ley 17.250), y los octógonos si es alimento envasado y los necesita.' : 'Completá la etiqueta con los datos obligatorios en español (Ley 17.250), y los octógonos si es alimento envasado y los necesita.']; },
        barras: function () { return s.barras === 'ext' ? ['Código de barras', 'No pudimos verificar si el código del fabricante del exterior le sirve a un importador en Uruguay. Consultalo con GS1 Uruguay.', 'https://gs1uy.org/preguntas-frecuentes/', 'GS1 Uruguay: preguntas frecuentes'] : ['Código de barras', 'GS1 Uruguay informa que las grandes superficies y los principales retailers usan códigos GS1 y que en la práctica suelen pedirlo. Confirmalo con el comprador. La afiliación, según GS1 Uruguay, demora 48 horas hábiles desde que reciben los formularios completos.', 'https://gs1uy.org/preguntas-frecuentes/', 'GS1 Uruguay: preguntas frecuentes']; },
        fact: function () { return s.fact === 'mono' ? ['Factura', 'La factura electrónica es obligatoria desde 2025 para los contribuyentes de IVA, con algunas excepciones. Confirmá con tu contador qué te corresponde.'] : s.fact === 'sin' ? ['Empresa que facture', 'Hace falta una empresa inscrita en el RUT que pueda facturar. Vemos juntos la mejor forma de empezar.'] : ['Factura', 'Confirmá con tu contador quién va a facturar y si le corresponde factura electrónica.']; },
        repo: function () { return s.repo === 'stock' ? ['Reposición', 'Tenés stock pero no logística propia: definí cómo vas a entregar sin cortes lo que te pidan.'] : s.repo === 'imp' ? ['Reposición', 'Si cada reposición depende de una importación, conviene tener stock en Uruguay antes de ir a una cadena.'] : ['Reposición', 'Calculá cuánto podés reponer por mes antes de hablar con un comprador.']; },
        prec: function () { return ['Precio en góndola y margen del comercio', 'Hacé la cuenta de cómo se arma el precio hasta la góndola y qué margen le queda al comercio.', '/herramientas/precio-en-gondola/', 'Hacer la cuenta']; }
      };
      var pend = SUP_L.filter(function (k) { return sc[k] !== 2; });
      var h = '<p class="eyebrow">Tu resultado</p><h2 class="dx-q" tabindex="-1">Para distribuidoras y almacenes: ' + VT[vd] + '.<br>Para cadenas de supermercados: ' + VT[vc] + '.</h2>';
      if (pend.length) {
        h += '<h3 class="dx-h3">Tus pendientes, en orden</h3><ol class="hr-list">' + pend.map(function (k) { var p = PEN[k](); return '<li><b>' + p[0] + '.</b> ' + p[1] + (p[2] ? ' <a href="' + p[2] + '"' + (p[2].charAt(0) === '/' ? '' : ' target="_blank" rel="noopener"') + '>' + p[3] + '</a>' : '') + '</li>'; }).join('') + '</ol>';
      } else h += '<p class="dx-p">No te quedan pendientes con lo que respondiste.</p>';
      h += '<p class="dx-p"><b>Presentar el producto no garantiza que la cadena lo liste.</b> Lo decide el comprador de cada categoría, y sus condiciones (listados, logística, plazos de pago) no son públicas.</p>';
      var n = pend.length, pts = ((s.repo === 'si' || s.repo === 'stock') ? 2 : 0) + (s.fact === 'emp' ? 2 : 0) + (n <= 2 ? 2 : n <= 4 ? 1 : 0);
      var det = SUP_L.map(function (k) { return k + ': ' + (sc[k] === -1 ? 'a confirmar' : sc[k]); }).join(' | ') + ' || Pendientes: ' + pend.join(', ');
      return {
        h: h, nivel: vc, cat: vd, conf: undefined,
        wa: 'Esto me dio la herramienta de supermercados de Grupo Meridian. Distribuidoras y almacenes: ' + VT[vd] + '. Cadenas: ' + VT[vc] + '. Pendientes: ' + n + '. Presentar el producto no garantiza que la cadena lo liste.',
        sheet: { tc: 'Mayoristas: ' + vd + ' / Cadenas: ' + (vc === 'falta' ? 'faltan ' + n : vc), vol: 'Pendientes: ' + n, det: det },
        prio: pts >= 5 ? 'A' : pts >= 3 ? 'B' : 'C',
        next: [['/herramientas/que-permisos-necesita-tu-producto/', 'Permisos de tu producto', 'otra_herramienta'], ['/herramientas/precio-en-gondola/', 'Precio en góndola', 'otra_herramienta'], ['/guias/vender-en-supermercados-uruguay/', 'Guía: cómo llegar a supermercados y mayoristas', 'guia']]
      };
    }
  };

  // =====================================================================
  // 5. ¿Conviene importar o comprar a un mayorista local?  (misma aritmética que la calculadora)
  // =====================================================================
  var CFG_L = { chicaPct: 15 }; // umbral provisorio: margen sobre el costo local
  function lnum(v) { return num(v); }
  TOOLS.local = {
    titulo: 'Importar o comprar local',
    steps: [
      { id: 'mismo', q: '¿El mismo producto, o uno equivalente, lo conseguís hoy en el mercado local?', o: [['igual', 'Sí, el mismo'], ['parecido', 'Uno parecido'], ['nolo', 'No lo hay']] },
      { id: 'contri', q: '¿Sos contribuyente de IVA?', when: function (s) { return s.mismo !== 'nolo'; }, o: [['si', 'Sí', 'El IVA y los anticipos no son costo para vos.'], ['no', 'No', 'Para vos el IVA de importación sí es un costo.']] },
      { id: 'loc', q: '¿Cuánto pagás hoy por unidad al mayorista local?', when: function (s) { return s.mismo !== 'nolo'; }, type: 'fields',
        fields: [{ id: 'loc', label: 'Precio por unidad, sin IVA, en USD', ph: '3,20', hint: 'Si pagás en pesos, pasalo a dólares con la cotización del día.' }],
        check: function (s) { return fnum(s.loc, 'el precio local por unidad', true); } },
      { id: 'ext', q: '¿Cuánto te cobra el proveedor del exterior y cuántas unidades traerías?', when: function (s) { return s.mismo !== 'nolo'; }, type: 'fields',
        fields: [{ id: 'fob', label: 'Precio FOB por unidad, en USD', ph: '1,20', hint: 'Lo que le pagás al proveedor, puesto en el puerto de origen.' },
          { id: 'uds', label: 'Unidades que traerías por compra', ph: '5000' },
          { id: 'flete', label: 'Flete y seguro de esa compra, en USD (opcional)', ph: '1.500', hint: 'Si no lo sabés, dejalo vacío: te mostramos hasta cuánto puede sumar sin que importar deje de convenir.' }],
        check: function (s) { return fnum(s.fob, 'el precio FOB', true) || fnum(s.uds, 'las unidades', true) || fnum(s.flete, 'el flete', false); } },
      { id: 'org', q: '¿De dónde viene y qué arancel paga?', when: function (s) { return s.mismo !== 'nolo'; }, type: 'fields',
        fields: [{ id: 'origen', label: 'Origen', kind: 'sel', def: 'gral', opts: [['gral', 'Otro origen (tasa consular 5 %)'], ['pref', 'Mercosur o Chile, con certificado de origen (tasa consular 3 %)']] },
          { id: 'tipo', label: 'Tipo de producto', kind: 'sel', def: 'gral', opts: [['gral', 'Otro producto'], ['alim', 'Alimento o bebida (suma la tasa del LATU, 0,5 %)']] },
          { id: 'ar', label: 'Arancel del producto, % (opcional)', ph: 'No lo sé', hint: 'Si no lo sabés, usamos el rango habitual de la calculadora, de 0 % a 20 %, y te avisamos que es un rango.' }],
        check: function (s) { var a = String(s.ar || '').trim(); if (!a) return ''; if (neg(a)) return 'El arancel no puede ser negativo.'; var n = num(a); return n === null || n > 35 ? 'Escribí el arancel como número entre 0 y 35, por ejemplo 12.' : ''; } },
      { id: 'ent', q: 'Si querés, sumá los gastos de entrada', when: function (s) { return s.mismo !== 'nolo'; }, type: 'fields', optional: true,
        fields: [{ id: 'gent', label: '¿Cuánto gastás de entrada para poder importarlo (registros, muestras, etc.), en USD? (opcional)', ph: '800' }],
        check: function (s) { return fnum(s.gent, 'el gasto de entrada', false); } }
    ],
    result: function (s) {
      var nx = [['/herramientas/que-permisos-necesita-tu-producto/', 'Permisos de tu producto', 'otra_herramienta'], ['/calculadora/', 'Calculadora completa', 'calculadora'], ['/herramientas/cuanto-comprar-primera-vez/', '¿Cuánto comprar la primera vez?', 'otra_herramienta']];
      if (s.mismo === 'nolo') {
        return { h: '<p class="eyebrow">Tu resultado</p><h2 class="dx-q" tabindex="-1">No hay con qué comparar: ahí importar es la única vía.</h2><p class="dx-p">Si no conseguís el producto en el mercado local, la pregunta ya no es «importar o comprar acá», sino cuánto te cuesta traerlo y qué permisos necesita. Seguí con los permisos o con la calculadora.</p>',
          nivel: 'sin_comparar', cat: 'nolo', wa: 'Esto me dio la herramienta «¿Importar o comprar local?» de Grupo Meridian: el producto no se consigue localmente, así que importar es la única vía.',
          sheet: { tc: 'Sin producto local', vol: 'Compra: sin datos', det: 'Producto local: no existe' }, prio: 'C', next: nx };
      }
      var loc = num(s.loc), fob = num(s.fob), uds = num(s.uds), flete = num(s.flete) || 0, noflete = !num(s.flete), pref = s.origen === 'pref', alim = s.tipo === 'alim', noc = s.contri === 'no';
      var aTxt = String(s.ar || '').trim(), ns = !aTxt, a = ns ? null : num(aTxt) / 100, aLo = ns ? 0 : a, aHi = ns ? 0.20 : a;
      var cons = pref ? 0.03 : 0.05, latu = alim ? 0.005 : 0, gent = num(s.gent);
      var cif = fob * uds + flete;
      function costo(ar) { // por unidad
        var ars = cif * ar, tc = cif * cons, lt = cif * latu, base = cif + ars, tr = ars + tc + lt;
        var iva = noc ? base * 1.5 * 0.22 : 0; // no contribuyente: la base del IVA sube un 50 % (como en la calculadora y las guías)
        return { cu: (cif + tr + iva) / uds, imp: (tr + iva) / uds };
      }
      var locC = noc ? loc * 1.22 : loc; // si no es contribuyente, el IVA del mayorista local también es costo
      var lo = costo(aLo), hi = costo(aHi), margen = (locC - hi.cu) * uds, pctM = margen / (locC * uds) * 100;
      var nivel = margen > 0 && pctM >= CFG_L.chicaPct ? 'importar' : margen > 0 ? 'chica' : 'local';
      var TT = { importar: 'Con tus números, importar parece dar margen.', chica: 'Con tus números, la diferencia es chica.', local: 'Con tus números, comprar local conviene.' };
      var h = '<p class="eyebrow">Tu resultado</p><h2 class="dx-q" tabindex="-1">' + TT[nivel] + '</h2>';
      h += '<p class="dx-p">' + ({ importar: 'Falta confirmar los gastos locales de cada compra, que no están en la cuenta.', chica: 'Hay una diferencia, pero chica: los gastos locales y el dinero inmovilizado pueden comérsela.', local: 'Si el precio local o el del exterior cambian, volvé a calcular.' })[nivel] + '</p>';
      var rg = function (x, y) { return Math.abs(x - y) < 0.005 ? usd(x) : usd(x) + ' a ' + usd(y).replace('USD ', ''); };
      h += '<table class="hr-tab"><thead><tr><th></th><th>Local</th><th>Importado, por unidad</th></tr></thead><tbody><tr><td>Costo por unidad' + (noc ? ', con IVA' : '') + '</td><td>' + usd(locC) + '</td><td>' + rg(lo.cu, hi.cu) + '</td></tr><tr><td>De los cuales, impuestos que quedan como costo</td><td></td><td>' + rg(lo.imp, hi.imp) + '</td></tr></tbody></table>';
      if (ns) h += '<p class="dx-p">No sabías el arancel: mostramos un rango de 0 % a 20 %, donde está el 99,1 % de los productos. Decidimos con el extremo más caro.</p>';
      if (margen > 0) h += '<p class="dx-p"><b>Margen para pagar los gastos locales de cada compra: ' + usd(margen) + '</b>' + (noflete ? ' (antes de flete y seguro, que no cargaste)' : '') + '. Con eso tenés que pagar despachante, puerto, depósito y transporte interno. Si esos gastos suman más, importar deja de convenir. No los estimamos porque no hay una cifra oficial y los honorarios varían.</p>';
      else h += '<p class="dx-p">Con estos números, importar sale más caro que comprar local aun antes de sumar los gastos locales (despachante, puerto, depósito y transporte).</p>';
      if (noflete && margen > 0) h += '<p class="dx-p">No cargaste el flete y seguro: ese margen de ' + usd(margen) + ' es lo máximo que podría sumar el flete, más los gastos locales, antes de que importar deje de convenir.</p>';
      if (gent && margen > 0) { var gan = locC - hi.cu; h += '<p class="dx-p">Para recuperar los ' + usd(gent) + ' de gastos de entrada hacen falta unas ' + intf(gent / gan) + ' unidades vendidas con esa diferencia por unidad.</p>'; }
      h += '<p class="dx-p"><b>Lo que no está en la cuenta:</b> los gastos locales de la compra, el dinero que queda parado hasta que llega la carga, el riesgo de calidad y las habilitaciones del producto. Importar es pagar antes y esperar la carga: solo el tránsito marítimo desde China ronda 30 a 40 días puerto a puerto según fuentes privadas, sin contar la producción. Comprar local suele resolverse con stock existente.</p>';
      h += '<p class="dx-p">' + (noc ? 'Como no sos contribuyente de IVA, el IVA es costo en los dos lados: al precio local le sumamos el 22 %, y al importado, el IVA de importación (22 % sobre una base que, en tu caso, sube un 50 %). Supone la tasa básica de IVA; confirmá tu caso con tu contador.' : 'Como sos contribuyente de IVA, no sumamos el IVA ni los anticipos al costo: se descuentan de tus liquidaciones, aunque hay que tener la caja el día del despacho.') + '</p>';
      var pts = ({ importar: 3, chica: 1, local: 0 })[nivel] + (cif >= 20000 ? 2 : cif >= 5000 ? 1 : 0) + (s.contri === 'si' ? 1 : 0);
      return {
        h: h, nivel: nivel, cat: s.mismo,
        wa: 'Esto me dio la herramienta «¿Importar o comprar local?» de Grupo Meridian. ' + TT[nivel] + ' Local ' + usd(locC) + ' por unidad; importado ' + rg(lo.cu, hi.cu) + ' por unidad. Margen para gastos locales: ' + (margen > 0 ? usd(margen) : 'ninguno') + '. Es un cálculo con los números que ingresé, no promete un ahorro.',
        sheet: { tc: TT[nivel].replace('Con tus números, ', ''), vol: 'Compra: ' + intf(uds) + ' unid · CIF ' + usd(cif), det: 'Local ' + usd(loc) + ' | FOB ' + usd(fob) + ' | Flete ' + (noflete ? 'sin indicar' : usd(flete)) + ' | Origen: ' + (pref ? 'Mercosur/Chile' : 'otro') + ' | Arancel: ' + (ns ? 'no sabe (0-20 %)' : pct(aLo * 100)) + ' | Contribuyente: ' + (noc ? 'no' : 'sí') + ' || Margen gastos locales: ' + (margen > 0 ? usd(margen) : 'ninguno') },
        prio: pts >= 6 ? 'A' : pts >= 3 ? 'B' : 'C', next: nx
      };
    }
  };

  // =====================================================================
  // 6. ¿Cuánto comprar la primera vez?
  // =====================================================================
  var CFG_Q = { mucho: 6, corto: 1 };
  TOOLS.lote = {
    titulo: 'Primera compra',
    steps: [
      { id: 'vence', q: '¿El producto vence o se deteriora?', o: [['si', 'Vence', 'Alimento, cosmético, etc.'], ['no', 'No vence'], ['nose', 'No sé']] },
      { id: 'vida', q: '¿Cuántos meses de vida útil tiene al llegar?', when: function (s) { return s.vence === 'si'; }, type: 'fields', optional: true,
        fields: [{ id: 'vida', label: 'Meses de vida útil al llegar a tu depósito', ph: '12' }], check: function (s) { return fnum(s.vida, 'los meses de vida útil', false); } },
      { id: 'minp', q: '¿Cuántas unidades trae como mínimo una compra del proveedor?', type: 'fields', optional: true,
        fields: [{ id: 'minp', label: 'Pedido mínimo, en unidades', ph: '2000', hint: 'Si no lo sabés, tocá «Saltar» y te mostramos distintos tamaños de pedido.' }], check: function (s) { return fnum(s.minp, 'el pedido mínimo', false); } },
      { id: 'pts', q: '¿En cuántos puntos de venta pensás empezar?', type: 'fields',
        fields: [{ id: 'pts', label: 'Puntos de venta', ph: '3', hint: 'Por ejemplo: «3 almacenes», o «1 distribuidora que reparte a 40 comercios» (poné 40).' }], check: function (s) { return fnum(s.pts, 'los puntos de venta', true); } },
      { id: 'rot', q: '¿Cuántas unidades creés que vende cada punto por mes?', type: 'fields', optional: true,
        fields: [{ id: 'rot', label: 'Unidades por punto por mes', ph: '10', hint: 'Si no lo sabés, tocá «Saltar» y te mostramos escenarios.' }], check: function (s) { return fnum(s.rot, 'las unidades por punto', false); } },
      { id: 'dep', q: '¿Tenés dónde guardarlo?', o: [['propio', 'Mi depósito'], ['alq', 'Un depósito alquilado'], ['no', 'No tengo todavía']] },
      { id: 'cap', q: '¿Cuánto dinero podés inmovilizar en esta primera compra?', optional: true, o: [['c1', 'Menos de USD 5.000'], ['c2', 'USD 5.000 a 20.000'], ['c3', 'Más de USD 20.000'], ['c0', 'Prefiero no decirlo']] }
    ],
    result: function (s) {
      var vida = num(s.vida), minp = num(s.minp), pts = num(s.pts), rot = num(s.rot), venceSi = s.vence === 'si';
      var rows, med, titulo;
      var m = function (mn, v) { return mn / v; };
      var mes = function (x) { return x >= 10 ? intf(x) : dec1(x); };
      var h = '<p class="eyebrow">Tu resultado</p>';
      var nivel, avisos = [], cat = s.dep;
      if (minp) {
        if (rot) { var v = pts * rot; rows = [['Más lenta que tu estimación (−50 %)', v * 0.5], ['Tu estimación', v], ['Más rápida (+50 %)', v * 1.5]]; med = m(minp, v); titulo = [m(minp, v * 1.5), m(minp, v * 0.5)]; }
        else { rows = [['Escenario: 1 unidad por punto por mes', pts * 1], ['Escenario: 5 unidades por punto por mes', pts * 5], ['Escenario: 10 unidades por punto por mes', pts * 10]]; med = m(minp, pts * 5); titulo = [m(minp, pts * 10), m(minp, pts * 1)]; }
        h += '<h2 class="dx-q" tabindex="-1">Tu pedido mínimo alcanzaría para ' + mes(titulo[0]) + ' a ' + mes(titulo[1]) + ' meses de venta.</h2>';
        h += '<table class="hr-tab"><thead><tr><th>Rotación</th><th>Venta por mes</th><th>Meses de stock</th></tr></thead><tbody>' + rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + intf(r[1]) + ' unid.</td><td>' + mes(m(minp, r[1])) + '</td></tr>'; }).join('') + '</tbody></table>';
        if (!rot) h += '<p class="hr-nota">Son escenarios para que veas el efecto, no datos del mercado.</p>';
        var peor = titulo[1];
        if (venceSi && vida && med > vida) avisos.push('El pedido mínimo es más de lo que se vende antes de que venza: hablá con el proveedor de otro formato, de un pedido combinado o de empezar con otra presentación.');
        else if (venceSi && vida && peor > vida) avisos.push('Si la rotación es más lenta que tu estimación, parte del pedido podría vencer antes de venderse.');
        if (med > CFG_Q.mucho) avisos.push('Es mucho stock para una primera prueba.');
        if (med < CFG_Q.corto) avisos.push('Con la compra mínima te quedás sin stock enseguida: la repetición de pedido es parte del plan.');
        nivel = (venceSi && vida && med > vida) || med > CFG_Q.mucho ? 'sobrestock' : med < CFG_Q.corto ? 'corto' : 'justo';
      } else {
        var v2 = rot ? pts * rot : pts * 5, base = [1, 3, 6];
        h += '<h2 class="dx-q" tabindex="-1">Sin pedido mínimo conocido: para 3 meses de venta harían falta unas ' + intf(v2 * 3) + ' unidades.</h2>';
        h += '<table class="hr-tab"><thead><tr><th>Stock para</th><th>Venta por mes</th><th>Pedido</th></tr></thead><tbody>' + base.map(function (b) { return '<tr><td>' + b + (b === 1 ? ' mes' : ' meses') + '</td><td>' + intf(v2) + ' unid.</td><td>' + intf(v2 * b) + ' unid.</td></tr>'; }).join('') + '</tbody></table>';
        h += '<p class="hr-nota">' + (rot ? 'Con tu estimación de rotación.' : 'Con un escenario de 5 unidades por punto por mes: es un escenario, no un dato del mercado.') + ' Cuando sepas el pedido mínimo, volvé a calcular.</p>';
        nivel = 'sin_minimo'; med = null;
      }
      if (s.dep === 'no') avisos.push('Si todavía no tenés dónde guardarlo, tené en cuenta que el depósito aduanero y el almacenaje corren por día. <a href="/guias/contenedor-en-el-puerto-de-montevideo-almacenaje-y-demoras/">Mirá la guía del contenedor en el puerto</a>.');
      if (avisos.length) h += '<ul class="dx-list">' + avisos.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>';
      var cons = nivel === 'sobrestock' ? 'probar primero con una compra más chica o con muestras' : nivel === 'corto' ? 'mezclar variedades en el mismo pedido y acordar con el proveedor cómo repetir' : 'consolidar carga con otras compras, así el flete por unidad no se come la primera prueba';
      h += '<h3 class="dx-h3">Cómo bajar el riesgo de la primera compra</h3><p class="dx-p">Una opción es ' + cons + '. Analizamos tu caso sin costo.</p>';
      h += '<p class="dx-p"><b>Lo que esta cuenta no sabe:</b> la rotación real de tu producto. ' + (rot ? 'Usa la estimación que cargaste vos.' : 'Usa escenarios, no datos del mercado.') + '</p>';
      var capL = s.cap && s.cap !== 'c0' ? lab(TOOLS.lote.steps[6], s.cap) : 'no indicó';
      var pp = ({ c3: 3, c2: 2 })[s.cap] || 1; pp += pts >= 10 ? 2 : pts >= 3 ? 1 : 0; pp += (s.dep === 'propio' || s.dep === 'alq') ? 1 : 0;
      var rngTxt = minp ? mes(titulo[0]) + ' a ' + mes(titulo[1]) + ' meses de stock' : 'sin pedido mínimo';
      return {
        h: h, nivel: nivel, cat: cat,
        wa: 'Esto me dio la herramienta «¿Cuánto comprar la primera vez?» de Grupo Meridian. ' + (minp ? 'Pedido mínimo ' + intf(minp) + ' unidades, ' + pts + ' puntos de venta: alcanza para ' + rngTxt + '.' : pts + ' puntos de venta, sin pedido mínimo conocido.') + ' Son mis estimaciones, no datos del mercado.',
        sheet: { tc: rngTxt, vol: 'Pedido mín.: ' + (minp ? intf(minp) : 'sin dato') + ' unid · Puntos: ' + intf(pts) + ' · Capital: ' + capL, det: 'Vence: ' + lab(TOOLS.lote.steps[0], s.vence) + (vida ? ' (' + intf(vida) + ' meses)' : '') + ' | Mín: ' + (minp ? intf(minp) : 'sin dato') + ' | Puntos: ' + intf(pts) + ' | Rotación: ' + (rot ? intf(rot) + ' por punto' : 'no sabe') + ' | Depósito: ' + lab(TOOLS.lote.steps[5], s.dep) + ' || ' + rngTxt },
        prio: pp >= 6 ? 'A' : pp >= 3 ? 'B' : 'C',
        next: [['/herramientas/precio-en-gondola/', 'Precio en góndola', 'otra_herramienta'], ['/herramientas/importar-o-comprar-local/', 'Importar o comprar local', 'otra_herramienta'], ['/herramientas/que-permisos-necesita-tu-producto/', 'Permisos de tu producto', 'otra_herramienta']]
      };
    }
  };

  // FIN TOOLS

  // =====================================================================
  // Motor
  // =====================================================================
  var T = TOOLS[NAME];
  if (!T) return;
  var s = {}, hist = [], started = false;
  var body = root.querySelector('.dx-body'), bar = root.querySelector('.dx-bar i'), count = root.querySelector('.dx-count');
  var last = null;

  function opts(st) { return typeof st.o === 'function' ? st.o(s) : st.o; }
  function visible() { return T.steps.filter(function (st) { return !st.when || st.when(s); }); }
  function scrollTop() { var r = root.getBoundingClientRect(); if (r.top < 0) window.scrollTo({ top: window.scrollY + r.top - 100, behavior: 'smooth' }); }
  function fieldLabel(f) { return typeof f.label === 'function' ? f.label(s) : f.label; }

  function render(i) {
    var vs = visible(), st = vs[i];
    if (!st) return result();
    document.body.classList.remove('herr-res');
    bar.style.width = Math.round((i / vs.length) * 100) + '%';
    count.textContent = 'Pregunta ' + (i + 1) + ' de ' + vs.length;
    var h = '<h2 class="dx-q" tabindex="-1">' + st.q + '</h2>';
    if (st.type === 'fields') {
      h += '<form class="lead hr-f" novalidate>';
      st.fields.forEach(function (f) {
        if (f.when && !f.when(s)) return;
        var v = s[f.id] != null ? s[f.id] : (f.def || '');
        if (f.kind === 'sel') h += '<label>' + fieldLabel(f) + '<select name="' + f.id + '">' + f.opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' + (f.hint || '') + '</label>';
        else h += '<label>' + fieldLabel(f) + '<input name="' + f.id + '" type="text" inputmode="decimal" maxlength="24" autocomplete="off" placeholder="' + (f.ph || '') + '" value="' + esc(v) + '">' + (f.hint ? (f.hint.charAt(0) === '<' ? f.hint : '<small>' + f.hint + '</small>') : '') + '</label>';
      });
      if (st.usar && saved()) h += '<button type="button" class="btn ghost hr-usar">Usar mi cálculo de la calculadora (' + usd(saved().puesto) + ')</button>';
      h += '<span class="err" role="alert"></span><div class="hr-btns"><button type="submit" class="btn dark">Seguir</button>' + (st.optional ? '<button type="button" class="btn ghost hr-skip">Saltar</button>' : '') + '</div></form>';
    } else {
      var os = opts(st);
      h += '<div class="dx-opts' + (os.length > 6 ? ' dx-opts-2' : '') + '">';
      os.forEach(function (o) { h += '<button type="button" class="dx-opt' + (s[st.id] === o[0] ? ' on' : '') + '" data-v="' + o[0] + '"><b>' + o[1] + '</b>' + (o[2] ? '<span>' + o[2] + '</span>' : '') + '</button>'; });
      h += '</div>';
    }
    h += (i > 0 ? '<button type="button" class="dx-back">← Volver</button>' : '') + (st.optional && st.type !== 'fields' ? ' <button type="button" class="dx-back hr-skip2">Saltar esta pregunta</button>' : '');
    body.innerHTML = h;
    body.querySelector('.dx-q').focus({ preventScroll: true });
    function avanzar() {
      if (!started) { started = true; ga('herr_inicio', { herramienta: NAME }); }
      ga('herr_paso', { herramienta: NAME, paso: i + 1, pregunta: st.id, respuesta: st.type === 'fields' ? 'campos' : s[st.id] });
      hist.push(i); render(i + 1); scrollTop();
    }
    if (st.type === 'fields') {
      var F = body.querySelector('form');
      var leer = function () { st.fields.forEach(function (f) { if (f.when && !f.when(s)) return; var el = F.querySelector('[name="' + f.id + '"]'); if (el) s[f.id] = String(el.value || '').trim(); }); };
      F.addEventListener('submit', function (ev) {
        ev.preventDefault(); leer();
        var e = st.check ? st.check(s) : '', er = F.querySelector('.err');
        if (e) { er.textContent = e; er.classList.add('show'); return; }
        avanzar();
      });
      var sk = F.querySelector('.hr-skip');
      if (sk) sk.addEventListener('click', function () { st.fields.forEach(function (f) { delete s[f.id]; }); avanzar(); });
      var us = F.querySelector('.hr-usar');
      if (us) us.addEventListener('click', function () { var el = F.querySelector('[name="costo"]'); el.value = String(Math.round(saved().puesto * 100) / 100).replace('.', ','); s.calc = '1'; ga('herr_extra', { herramienta: NAME, pregunta: 'usar_calculo', respuesta: 'si' }); });
    } else {
      body.querySelectorAll('.dx-opt').forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-v');
          if (s[st.id] !== v) { // si cambia una respuesta, lo que dependía de ella se descarta
            var idx = T.steps.indexOf(st);
            T.steps.slice(idx + 1).forEach(function (x) { if (x.type !== 'fields' && x.o && typeof x.o === 'function') delete s[x.id]; });
          }
          s[st.id] = v; avanzar();
        });
      });
    }
    var sk2 = body.querySelector('.hr-skip2');
    if (sk2) sk2.addEventListener('click', function () { delete s[st.id]; avanzar(); });
    var back = body.querySelector('.dx-back');
    if (back) back.addEventListener('click', function () { render(hist.pop() || 0); scrollTop(); });
  }

  // ---------- pantalla de resultado y contacto opcional
  function cod(o) { try { return encodeURIComponent(JSON.stringify(o)); } catch (e) { return ''; } }
  function result() {
    var r = T.result(s); last = r;
    document.body.classList.add('herr-res');
    bar.style.width = '100%'; count.textContent = '';
    ga('herr_resultado', { herramienta: NAME, nivel: r.nivel, categoria: r.cat || '', confianza: r.conf || '' });
    if (r.extra) ga('herr_extra', { herramienta: NAME, pregunta: r.extra, respuesta: 'si' });
    try { history.replaceState(null, '', '#r=' + cod(s)); } catch (e) {}
    var h = r.h;
    h += '<h3 class="dx-h3">Seguí con…</h3><div class="dx-guides">' + r.next.map(function (n) { return '<a href="' + n[0] + '" data-herr-cta="' + n[2] + '">' + n[1] + ' →</a>'; }).join('') + '</div>';
    h += '<div class="hr-acts"><button type="button" class="btn wa-b" id="hr-wa">Mandármelo por WhatsApp</button>' +
      '<a class="btn ghost" id="hr-caso" href="' + WA + '?text=' + encodeURIComponent('Hola, usé la herramienta "' + T.titulo + '" de la web y quiero que revisen mi caso. ' + r.wa) + '" target="_blank" rel="noopener">Que revisen mi caso, sin costo</a>' +
      '<button type="button" class="btn ghost" id="hr-copy">Copiar enlace a este resultado</button></div>';
    h += '<p class="hr-aviso">' + (r.verif ? r.verif + ' ' : '') + AVISO + '</p>';
    h += '<div class="dx-cap"><h3 class="dx-h3">¿Preferís que te escribamos nosotros?</h3><p class="dx-p">Analizamos tu caso sin costo. Dejá tu nombre y un WhatsApp o correo, y te escribimos por WhatsApp o por correo. Es opcional: el resultado ya lo tenés completo.</p>' +
      '<form id="hr-form" class="lead" novalidate>' +
      '<div class="row"><label>Tu nombre *<input name="nom" type="text" maxlength="100" autocomplete="name" required></label>' +
      '<label>WhatsApp o correo *<input name="ct" type="text" maxlength="100" autocomplete="off" required></label></div>' +
      (T.form ? '<label>' + T.form.label + '<select name="' + T.form.id + '">' + T.form.opts.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select></label>' : '') +
      '<label>Qué producto es (opcional)<textarea name="prod" maxlength="800" placeholder="Qué es y cualquier dato que sume"></textarea></label>' +
      '<div class="hp" aria-hidden="true"><label>No completar<input name="web" type="text" tabindex="-1" autocomplete="off"></label></div>' +
      '<span class="err" id="hr-err" role="alert">Necesitamos tu nombre y un WhatsApp o un correo válido para responderte.</span>' +
      '<button class="btn dark" type="submit">Que me escriban</button>' +
      '<span class="note">Usamos estos datos solo para responderte. <a href="/politica-de-privacidad/"><u>Política de privacidad</u></a>.</span>' +
      '<div class="sent" id="hr-ok" role="status"></div></form></div>' +
      '<button type="button" class="dx-back" id="hr-redo">← Cambiar respuestas</button>';
    body.innerHTML = h;
    body.querySelector('.dx-q').focus({ preventScroll: true });
    scrollTop();
    body.querySelectorAll('[data-herr-cta]').forEach(function (a) { a.addEventListener('click', function () { ga('herr_cta', { herramienta: NAME, tipo: a.getAttribute('data-herr-cta') }); }); });
    document.getElementById('hr-wa').addEventListener('click', function () { ga('herr_cta', { herramienta: NAME, tipo: 'whatsapp' }); window.open('https://wa.me/?text=' + encodeURIComponent(r.wa), '_blank', 'noopener'); });
    document.getElementById('hr-caso').addEventListener('click', function () { ga('herr_cta', { herramienta: NAME, tipo: 'revisar_caso' }); });
    var cp = document.getElementById('hr-copy');
    cp.addEventListener('click', function () {
      ga('herr_cta', { herramienta: NAME, tipo: 'copiar_enlace' });
      var u = location.href, ok = function () { cp.textContent = 'Enlace copiado'; };
      try { navigator.clipboard.writeText(u).then(ok, function () { window.prompt('Copiá el enlace:', u); }); } catch (e) { window.prompt('Copiá el enlace:', u); }
    });
    document.getElementById('hr-redo').addEventListener('click', function () { hist = []; s = {}; try { history.replaceState(null, '', location.pathname); } catch (e) {} render(0); scrollTop(); });
    var F = document.getElementById('hr-form');
    F.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = function (n) { var el = F.querySelector('[name="' + n + '"]'); return el ? String(el.value || '').trim() : ''; };
      if (v('web')) return;
      var nom = v('nom').replace(/[<>|]/g, ''), ct = v('ct'), err = document.getElementById('hr-err');
      var esMail = /^[^\s@|]+@[^\s@|]+\.[^\s@|]+$/.test(ct), esTel = !/@/.test(ct) && ct.replace(/\D/g, '').length >= 8 && ct.replace(/\D/g, '').length <= 15 && ct.length <= 40;
      if (!nom || (!esMail && !esTel)) { err.classList.add('show'); return; }
      err.classList.remove('show');
      var pv = T.form ? v(T.form.id) : '', prio = T.prioForm ? T.prioForm(r, pv) : r.prio;
      var tc = ('Herramienta .com · ' + T.titulo + ' · Prioridad ' + prio + ' · ' + r.sheet.tc).slice(0, 120);
      var d = { tipo: 'comercio', nombre: nom, comercio: '(sin empresa) ' + nom.slice(0, 60), telefono: esTel ? ct : '', departamento: '',
        tipo_comercio: tc, volumen: String(r.sheet.vol).slice(0, 120),
        productos: 'Producto: ' + (v('prod') || '(sin describir)') + ' || ' + r.sheet.det + (T.form ? ' || Perfil: ' + (T.form.opts.filter(function (o) { return o[0] === pv; })[0] || ['', 'no indicó'])[1] : '') + (esMail ? ' || Email: ' + ct : ''),
        origen: 'grupomeridianuy.com' + location.pathname + (document.referrer ? ' ← ' + document.referrer : '') };
      var msg = 'Hola, soy ' + nom + '. Usé la herramienta "' + T.titulo + '" de la web. ' + r.wa;
      var ok = document.getElementById('hr-ok'), btn = F.querySelector('button[type=submit]');
      btn.disabled = true; btn.style.opacity = '.5';
      GM.enviar(d, function () {
        ga('generate_lead', { envio_id: GM.ultimoEnvio, lead_source: 'herr_' + NAME, prioridad: prio, categoria: r.cat || '' });
        ga('herr_cta', { herramienta: NAME, tipo: 'formulario' });
        ok.innerHTML = '<b>Recibido, ' + esc(nom) + '.</b> Te vamos a escribir por WhatsApp o por correo. Si querés adelantar, <a href="' + WA + '?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">mandanos esto por WhatsApp</a>.';
        ok.classList.add('show');
      }, function () {
        GM.fallo(ok, WA + '?text=' + encodeURIComponent(msg));
        btn.disabled = false; btn.style.opacity = '';
      });
    });
  }

  // ---------- resultado compartido en el #hash (no sale del navegador)
  function restaurar() {
    var m = /^#r=(.+)$/.exec(location.hash || '');
    if (!m) return false;
    var o; try { o = JSON.parse(decodeURIComponent(m[1])); } catch (e) { return false; }
    if (!o || typeof o !== 'object') return false;
    var ns = {}; s = ns;
    for (var pass = 0; pass < 12; pass++) { // en cada vuelta se aceptan los pasos que ya son visibles con lo aceptado
      visible().forEach(function (st) {
        var x = o[st.id];
        if (st.type === 'fields') {
          st.fields.forEach(function (f) {
            if (f.when && !f.when(ns)) return;
            var y = o[f.id];
            if (typeof y === 'string' && y.length <= 24 && (f.kind === 'sel' ? f.opts.some(function (q) { return q[0] === y; }) : /^[\d.,%\s]*$/.test(y))) ns[f.id] = y;
          });
        } else if (typeof x === 'string' && opts(st).some(function (q) { return q[0] === x; })) ns[st.id] = x;
      });
    }
    var okAll = visible().every(function (st) {
      if (st.optional) return true;
      if (st.type === 'fields') { return !st.check || !st.check(ns); }
      return !!ns[st.id];
    });
    if (!okAll) { s = {}; return false; }
    started = true; hist = [0]; result();
    return true;
  }

  if (!restaurar()) render(0);
})();
