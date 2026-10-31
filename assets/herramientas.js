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
      var imp = { propia: 'Con empresa propia, la habilitación de la empresa la tramitás vos.', sin: 'Primero hace falta tener la empresa inscrita en el RUT.', otra: 'La habilitación la tiene que tener quien figure como importador; lo vemos en tu caso.', nose: 'Conviene definir primero qué empresa va a figurar como importadora: de eso depende quién tramita qué.' }[s.imp];
      h += '<p class="dx-p">' + imp + '</p>';
      if ((s.ncm === 'no' || s.ncm === 'nose') && s.det !== 'masc_ar') h += '<p class="dx-p">El código arancelario define cuánto arancel paga el producto y si necesita algún permiso. Lo confirma tu despachante antes de comprar.</p>';
      h += '<p class="dx-p"><b>También tenés que tener:</b> RUT activo en DGI, registro en VUCE (se hace una vez) y un despachante de aduana, que es obligatorio para importar. Si querés la preferencia arancelaria de un origen, hace falta certificado de origen.</p>';
      if (c.nivel === 'alta') h += '<p class="dx-p"><b>Esto no significa que no se pueda.</b> Significa que el orden importa: conviene resolver la habilitación antes de pagar. Si querés, vemos juntos cuál es la forma más sencilla de arrancar en tu caso. Analizamos tu caso sin costo.</p>';
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
    return n === null || n === 0 ? 'Escribí un número mayor a cero en ' + que + ' (por ejemplo 12,50).' : '';
  }
  function fmar(v, que) {
    var n = num(v);
    if (neg(v)) return 'No puede ser negativo (' + que + ').';
    if (n === null) return 'Escribí ' + que + ' como número, por ejemplo 25.';
    return n >= 90 ? 'Un margen de 90 % o más no es una cuenta realista (' + que + '). Poné un valor menor.' : '';
  }

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
    h += (i > 0 ? '<button type="button" class="dx-back">← Volver</button>' : '');
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
    var back = body.querySelector('.dx-back');
    if (back) back.addEventListener('click', function () { render(hist.pop() || 0); scrollTop(); });
  }

  // ---------- pantalla de resultado y contacto opcional
  function cod(o) { try { return encodeURIComponent(JSON.stringify(o)); } catch (e) { return ''; } }
  function result() {
    var r = T.result(s); last = r;
    document.body.classList.add('herr-res');
    bar.style.width = '100%'; count.textContent = '';
    ga('herr_resultado', { herramienta: NAME, nivel: r.nivel, categoria: r.cat || '' });
    if (r.extra) ga('herr_extra', { herramienta: NAME, pregunta: r.extra, respuesta: 'si' });
    try { history.replaceState(null, '', '#r=' + cod(s)); } catch (e) {}
    var h = r.h;
    h += '<h3 class="dx-h3">Seguí con…</h3><div class="dx-guides">' + r.next.map(function (n) { return '<a href="' + n[0] + '" data-herr-cta="' + n[2] + '">' + n[1] + ' →</a>'; }).join('') + '</div>';
    h += '<div class="hr-acts"><button type="button" class="btn wa-b" id="hr-wa">Mandármelo por WhatsApp</button>' +
      '<a class="btn ghost" id="hr-caso" href="' + WA + '?text=' + encodeURIComponent('Hola, usé la herramienta "' + T.titulo + '" de la web y quiero que revisen mi caso. ' + r.wa) + '" target="_blank" rel="noopener">Que revisen mi caso, sin costo</a>' +
      '<button type="button" class="btn ghost" id="hr-copy">Copiar enlace a este resultado</button></div>';
    h += '<p class="hr-aviso"><b>Información general, no asesoramiento.</b> ' + (r.verif ? r.verif + ' ' : '') + AVISO + '</p>';
    h += '<div class="dx-cap"><h3 class="dx-h3">¿Preferís que te escribamos nosotros?</h3><p class="dx-p">Analizamos tu caso sin costo. Dejá tu nombre y un WhatsApp o correo, y un especialista te escribe en horario comercial. Es opcional: el resultado ya lo tenés completo.</p>' +
      '<form id="hr-form" class="lead" novalidate>' +
      '<div class="row"><label>Tu nombre *<input name="nom" type="text" maxlength="100" autocomplete="name" required></label>' +
      '<label>WhatsApp o correo *<input name="ct" type="text" maxlength="100" autocomplete="off" required></label></div>' +
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
      var tc = ('Herramienta .com · ' + T.titulo + ' · Prioridad ' + r.prio + ' · ' + r.sheet.tc).slice(0, 120);
      var d = { tipo: 'comercio', nombre: nom, comercio: '(sin empresa) ' + nom.slice(0, 60), telefono: esTel ? ct : '', departamento: '',
        tipo_comercio: tc, volumen: String(r.sheet.vol).slice(0, 120),
        productos: 'Producto: ' + (v('prod') || '(sin describir)') + ' || ' + r.sheet.det + (esMail ? ' || Email: ' + ct : ''),
        origen: 'grupomeridianuy.com' + location.pathname + (document.referrer ? ' ← ' + document.referrer : '') };
      var msg = 'Hola, soy ' + nom + '. Usé la herramienta "' + T.titulo + '" de la web. ' + r.wa;
      var ok = document.getElementById('hr-ok'), btn = F.querySelector('button[type=submit]');
      btn.disabled = true; btn.style.opacity = '.5';
      GM.enviar(d, function () {
        ga('generate_lead', { envio_id: GM.ultimoEnvio, lead_source: 'herr_' + NAME, prioridad: r.prio, categoria: r.cat || '' });
        ga('herr_cta', { herramienta: NAME, tipo: 'formulario' });
        ok.innerHTML = '<b>Recibido, ' + esc(nom) + '.</b> Te escribimos en horario comercial. Si querés adelantar, <a href="' + WA + '?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">mandanos esto por WhatsApp</a>.';
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
