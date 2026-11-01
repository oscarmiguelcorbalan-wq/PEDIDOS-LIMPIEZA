/**
 * PEDIDOS-LIMPIEZA · API (Google Apps Script)
 * ------------------------------------------------------------
 * Hoja de Google = base de datos. Esta API la usan:
 *   - index.html  (app de clientes: catálogo y pedidos)
 *   - admin.html  (app de gestión: pedidos, stock, tarifas, ofertas, presupuestos)
 *
 * Instalación (una sola vez):
 *   1. Abrí la hoja PEDIDOS-LIMPIEZA > Extensiones > Apps Script.
 *   2. Pegá este archivo entero en Code.gs y guardá.
 *   3. Ejecutá la función "setup" (crea pestañas que falten y datos de ejemplo).
 *   4. Implementar > Nueva implementación > Aplicación web
 *        Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 *   5. Copiá la URL /exec y pegala en config.js del repo de GitHub.
 *   Cada vez que cambies este código: Implementar > Gestionar implementaciones >
 *   editar (lápiz) > Versión: Nueva versión > Implementar (la URL no cambia).
 */

const HOJAS = {
  Productos:    ['ID', 'Producto', 'Descripción', 'Categoría', 'Unidad', 'Precio', 'Stock', 'Stock mínimo', 'Imagen', 'Activo'],
  Clientes:     ['ID', 'Nombre', 'Contacto', 'Teléfono', 'Email', 'Dirección', 'Código acceso', 'Tarifa', 'Activo'],
  Tarifas:      ['Tarifa', 'Descuento %', 'Notas'],
  Ofertas:      ['ID', 'Producto ID', 'Título', 'Tipo', 'Valor', 'Cantidad mínima', 'Desde', 'Hasta', 'Activa'],
  Pedidos:      ['ID', 'Fecha', 'Cliente ID', 'Cliente', 'Detalle', 'Total', 'Estado', 'Notas cliente', 'Notas internas', 'Stock descontado', 'Actualizado'],
  Presupuestos: ['ID', 'Fecha', 'Cliente', 'Detalle', 'Descuento extra %', 'Total', 'Válido hasta', 'Estado', 'Notas'],
  Movimientos:  ['Fecha', 'Producto ID', 'Producto', 'Tipo', 'Cantidad', 'Stock resultante', 'Motivo'],
  Config:       ['Clave', 'Valor']
};

const ESTADOS = ['Nuevo', 'Confirmado', 'Preparado', 'Enviado', 'Entregado', 'Cancelado'];
// Estados en los que el stock ya está descontado
const ESTADOS_CON_STOCK = ['Confirmado', 'Preparado', 'Enviado', 'Entregado'];

/* =========================== SETUP =========================== */

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HOJAS).forEach(nombre => {
    let sh = ss.getSheetByName(nombre);
    if (!sh) sh = ss.insertSheet(nombre);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, HOJAS[nombre].length).setValues([HOJAS[nombre]])
        .setFontWeight('bold').setBackground('#0e7490').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
  });
  const hoja1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (hoja1 && hoja1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(hoja1);

  if (ss.getSheetByName('Productos').getLastRow() < 2) {
    const p = [
      ['P001', 'Lavandina', 'Lavandina concentrada para desinfectar y blanquear', 'Químicos', 'Bidón 5 L', 4500, 40, 10, 'img/lavandina.svg', 'SI'],
      ['P002', 'Desodorante p/piso', 'Limpiador perfumado para pisos', 'Químicos', 'Bidón 5 L', 5200, 30, 8, 'img/desodorante-piso.svg', 'SI'],
      ['P003', 'Detergente', 'Detergente lavavajillas concentrado', 'Químicos', 'Bidón 5 L', 6000, 35, 8, 'img/detergente.svg', 'SI'],
      ['P004', 'Rejilla', 'Rejilla de algodón para cocina', 'Paños', 'Unidad', 900, 100, 20, 'img/rejilla.svg', 'SI'],
      ['P005', 'Trapo de piso', 'Trapo de piso de algodón gris', 'Paños', 'Unidad', 1300, 80, 20, 'img/trapo-piso.svg', 'SI'],
      ['P006', 'Esponja', 'Esponja doble faz (lado abrasivo verde)', 'Accesorios', 'Unidad', 600, 120, 30, 'img/esponja.svg', 'SI'],
      ['P007', 'Esponja de acero', 'Virulana / esponja de acero inoxidable', 'Accesorios', 'Unidad', 700, 90, 20, 'img/esponja-acero.svg', 'SI'],
      ['P008', 'Haragán', 'Secador de piso de goma con cabo', 'Utensilios', 'Unidad', 4200, 25, 5, 'img/haragan.svg', 'SI'],
      ['P009', 'Escobillón', 'Escobillón de cerdas con cabo', 'Utensilios', 'Unidad', 4800, 25, 5, 'img/escobillon.svg', 'SI'],
      ['P010', 'Bolsa de residuo', 'Bolsas de residuo negras 60x90', 'Descartables', 'Paquete x10', 1500, 60, 15, 'img/bolsa-residuo.svg', 'SI']
    ];
    ss.getSheetByName('Productos').getRange(2, 1, p.length, p[0].length).setValues(p);
  }
  if (ss.getSheetByName('Tarifas').getLastRow() < 2) {
    ss.getSheetByName('Tarifas').getRange(2, 1, 3, 3).setValues([
      ['General', 0, 'Precio de lista'],
      ['Mayorista', 10, 'Clientes con volumen'],
      ['Distribuidor', 18, 'Revendedores']
    ]);
  }
  if (ss.getSheetByName('Clientes').getLastRow() < 2) {
    ss.getSheetByName('Clientes').getRange(2, 1, 1, 9).setValues([
      ['C001', 'Cliente de prueba', 'Nombre contacto', '', '', '', 'PRUEBA1', 'General', 'SI']
    ]);
  }
  if (ss.getSheetByName('Config').getLastRow() < 2) {
    ss.getSheetByName('Config').getRange(2, 1, 5, 2).setValues([
      ['Empresa', 'Mi Empresa de Limpieza'],
      ['PIN admin', '1234'],
      ['Moneda', '$'],
      ['WhatsApp', ''],
      ['Validez presupuesto (días)', 15]
    ]);
    ss.getSheetByName('Config').getRange('B3').setNumberFormat('@').setValue('1234');
  }
}

/* =========================== HTTP =========================== */

function doGet(e) { return manejar(e && e.parameter ? e.parameter : {}); }

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) { body = {}; }
  return manejar(body);
}

function manejar(req) {
  let out;
  try {
    const accion = req.accion || '';
    const publicas = { catalogo: 1, crearPedido: 1, misPedidos: 1, info: 1 };
    if (!publicas[accion]) verificarPin(req.pin);
    const fn = ACCIONES[accion];
    if (!fn) throw new Error('Acción desconocida: ' + accion);
    out = { ok: true, data: fn(req) };
  } catch (err) {
    out = { ok: false, error: String(err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

const ACCIONES = {
  // ---------- públicas ----------
  info: () => ({ empresa: cfg('Empresa'), moneda: cfg('Moneda'), whatsapp: cfg('WhatsApp') }),
  catalogo: req => {
    const cli = clientePorCodigo(req.codigo);
    return { cliente: { id: cli.ID, nombre: cli.Nombre, tarifa: cli.Tarifa }, empresa: cfg('Empresa'),
             moneda: cfg('Moneda'), whatsapp: cfg('WhatsApp'), productos: catalogoPara(cli) };
  },
  crearPedido: req => crearPedido(req),
  misPedidos: req => {
    const cli = clientePorCodigo(req.codigo);
    return leer('Pedidos').filter(p => p['Cliente ID'] === cli.ID).map(pedidoOut).reverse().slice(0, 30);
  },

  // ---------- admin ----------
  login: () => ({ ok: true }),
  todo: () => ({
    config: leerConfig(),
    productos: leer('Productos').map(productoOut),
    clientes: leer('Clientes'),
    tarifas: leer('Tarifas'),
    ofertas: leer('Ofertas').map(fechasOut),
    pedidos: leer('Pedidos').map(pedidoOut).reverse(),
    presupuestos: leer('Presupuestos').map(presuOut).reverse(),
    movimientos: leer('Movimientos').map(fechasOut).reverse().slice(0, 300),
    estados: ESTADOS
  }),
  guardarProducto: req => guardarFila('Productos', 'ID', req.item, 'P'),
  guardarCliente: req => {
    if (!req.item['Código acceso']) req.item['Código acceso'] = codigoAleatorio();
    const repetido = leer('Clientes').find(c => String(c['Código acceso']).toUpperCase() === String(req.item['Código acceso']).toUpperCase() && c.ID !== req.item.ID);
    if (repetido) throw new Error('Ese código de acceso ya lo usa ' + repetido.Nombre);
    return guardarFila('Clientes', 'ID', req.item, 'C');
  },
  guardarTarifa: req => guardarFila('Tarifas', 'Tarifa', req.item, null),
  borrarTarifa: req => borrarFila('Tarifas', 'Tarifa', req.id),
  guardarOferta: req => guardarFila('Ofertas', 'ID', req.item, 'O'),
  borrarOferta: req => borrarFila('Ofertas', 'ID', req.id),
  ajustarStock: req => ajustarStock(req.id, Number(req.cantidad), req.tipo || 'Ajuste', req.motivo || ''),
  estadoPedido: req => cambiarEstado(req.id, req.estado, req.notas),
  guardarPresupuesto: req => guardarPresupuesto(req),
  presupuestoAPedido: req => presupuestoAPedido(req.id),
  guardarConfig: req => {
    const sh = hoja('Config'); const vals = sh.getDataRange().getValues();
    Object.keys(req.item).forEach(k => {
      const i = vals.findIndex(r => r[0] === k);
      if (i > 0) sh.getRange(i + 1, 2).setValue(req.item[k]);
      else sh.appendRow([k, req.item[k]]);
    });
    return leerConfig();
  },
  calcular: req => calcularLineas(req.lineas, tarifaDesc(req.tarifa))
};

/* =========================== DATOS =========================== */

function hoja(n) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n);
  if (!sh) throw new Error('Falta la pestaña ' + n + '. Ejecutá setup().');
  return sh;
}

function leer(n) {
  const vals = hoja(n).getDataRange().getValues();
  const head = vals.shift() || [];
  return vals.filter(r => r.some(c => c !== '')).map(r => {
    const o = {}; head.forEach((h, i) => o[h] = r[i]); return o;
  });
}

function guardarFila(n, clave, item, prefijo) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = hoja(n); const vals = sh.getDataRange().getValues(); const head = vals[0];
    const ci = head.indexOf(clave);
    if (!item[clave] && prefijo) item[clave] = siguienteId(vals.slice(1).map(r => r[ci]), prefijo, 3);
    if (!item[clave]) throw new Error('Falta ' + clave);
    const fila = head.map(h => item[h] === undefined ? '' : item[h]);
    const idx = vals.findIndex((r, i) => i > 0 && String(r[ci]) === String(item[clave]));
    if (idx > 0) {
      const actual = vals[idx];
      const merged = head.map((h, i) => item[h] === undefined ? actual[i] : fila[i]);
      sh.getRange(idx + 1, 1, 1, head.length).setValues([merged]);
    } else sh.appendRow(fila);
    return item;
  } finally { lock.releaseLock(); }
}

function borrarFila(n, clave, id) {
  const sh = hoja(n); const vals = sh.getDataRange().getValues(); const ci = vals[0].indexOf(clave);
  for (let i = vals.length - 1; i > 0; i--) if (String(vals[i][ci]) === String(id)) { sh.deleteRow(i + 1); return true; }
  return false;
}

function siguienteId(ids, prefijo, ancho) {
  let max = 0;
  ids.forEach(v => { const m = String(v).match(/(\d+)$/); if (m) max = Math.max(max, Number(m[1])); });
  return prefijo + String(max + 1).padStart(ancho, '0');
}

function codigoAleatorio() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = '';
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function leerConfig() { const o = {}; leer('Config').forEach(r => o[r.Clave] = r.Valor); return o; }
function cfg(k) { const v = leerConfig()[k]; return v === undefined ? '' : v; }

function verificarPin(pin) {
  if (String(pin || '') !== String(cfg('PIN admin'))) throw new Error('PIN incorrecto');
}

function si(v) { return v === true || String(v).trim().toUpperCase() === 'SI' || String(v).trim().toUpperCase() === 'SÍ'; }
function iso(d) { return d instanceof Date ? Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss") : (d || ''); }
function fechasOut(o) { const r = {}; Object.keys(o).forEach(k => r[k] = o[k] instanceof Date ? iso(o[k]) : o[k]); return r; }
function productoOut(p) { return fechasOut(p); }
function pedidoOut(p) { const o = fechasOut(p); try { o.Detalle = JSON.parse(p.Detalle || '[]'); } catch (e) { o.Detalle = []; } return o; }
function presuOut(p) { return pedidoOut(p); }
function r2(n) { return Math.round(Number(n) * 100) / 100; }

/* =========================== PRECIOS =========================== */

function clientePorCodigo(codigo) {
  const c = String(codigo || '').trim().toUpperCase();
  if (!c) throw new Error('Falta el código de cliente');
  const cli = leer('Clientes').find(x => String(x['Código acceso']).trim().toUpperCase() === c);
  if (!cli || !si(cli.Activo)) throw new Error('Código de cliente no válido');
  return cli;
}

function tarifaDesc(nombre) {
  const t = leer('Tarifas').find(x => String(x.Tarifa) === String(nombre));
  return t ? Number(t['Descuento %']) || 0 : 0;
}

function ofertasVigentes() {
  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  const fecha = v => v instanceof Date ? v : (v ? new Date(String(v).slice(0, 10) + 'T12:00:00') : null);
  return leer('Ofertas').filter(o => {
    if (!si(o.Activa)) return false;
    const d = fecha(o.Desde), h = fecha(o.Hasta);
    if (d && !isNaN(d) && d > hoy) { const dd = new Date(d); dd.setHours(0, 0, 0, 0); if (dd > hoy) return false; }
    if (h && !isNaN(h)) { const hh = new Date(h); hh.setHours(23, 59, 59); if (hh < hoy) return false; }
    return true;
  });
}

/** Precio unitario para un producto, cantidad y descuento de tarifa. Se queda con el mejor precio. */
function precioUnitario(prod, cantidad, desc, ofertas) {
  const base = Number(prod.Precio) || 0;
  let mejor = r2(base * (1 - desc / 100)); let oferta = null;
  ofertas.filter(o => String(o['Producto ID']) === String(prod.ID)).forEach(o => {
    const min = Number(o['Cantidad mínima']) || 1;
    if (cantidad < min) return;
    const p = String(o.Tipo).toUpperCase().indexOf('PRECIO') === 0 ? Number(o.Valor) : r2(base * (1 - Number(o.Valor) / 100));
    if (p < mejor) { mejor = p; oferta = o.Título || 'Oferta'; }
  });
  return { precio: mejor, base: base, oferta: oferta };
}

function catalogoPara(cli) {
  const desc = tarifaDesc(cli.Tarifa); const ofs = ofertasVigentes();
  return leer('Productos').filter(p => si(p.Activo)).map(p => {
    const u = precioUnitario(p, 1, desc, ofs);
    const misOfertas = ofs.filter(o => String(o['Producto ID']) === String(p.ID)).map(o => ({
      titulo: o.Título, tipo: String(o.Tipo).toUpperCase(), valor: Number(o.Valor), min: Number(o['Cantidad mínima']) || 1,
      hasta: iso(o.Hasta)
    }));
    const stock = Number(p.Stock) || 0;
    return { id: p.ID, nombre: p.Producto, descripcion: p.Descripción, categoria: p.Categoría, unidad: p.Unidad,
             imagen: p.Imagen, precioLista: Number(p.Precio) || 0, precio: u.precio, ofertas: misOfertas,
             disponibilidad: stock <= 0 ? 'sin' : (stock <= (Number(p['Stock mínimo']) || 0) ? 'poco' : 'ok'),
             tarifaDesc: desc };
  });
}

function calcularLineas(lineas, desc) {
  const prods = {}; leer('Productos').forEach(p => prods[p.ID] = p);
  const ofs = ofertasVigentes(); let total = 0;
  const det = (lineas || []).filter(l => Number(l.cantidad) > 0 && prods[l.id]).map(l => {
    const p = prods[l.id]; const cant = Number(l.cantidad);
    const u = (l.precio !== undefined && l.precio !== null && l.precio !== '') ? { precio: Number(l.precio), base: Number(p.Precio), oferta: l.oferta || null }
                                                                              : precioUnitario(p, cant, desc, ofs);
    const sub = r2(u.precio * cant); total += sub;
    return { id: p.ID, nombre: p.Producto, unidad: p.Unidad, cantidad: cant, precioLista: u.base, precio: u.precio, oferta: u.oferta, subtotal: sub };
  });
  return { lineas: det, total: r2(total) };
}

/* =========================== PEDIDOS =========================== */

function crearPedido(req) {
  const cli = clientePorCodigo(req.codigo);
  const lineas = (req.lineas || []).map(l => ({ id: l.id, cantidad: l.cantidad })); // el precio lo calcula el servidor
  const calc = calcularLineas(lineas, tarifaDesc(cli.Tarifa));
  if (!calc.lineas.length) throw new Error('El pedido está vacío');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = hoja('Pedidos');
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => r[0]) : [];
    const id = siguienteId(ids, 'PED-', 4); const ahora = new Date();
    sh.appendRow([id, ahora, cli.ID, cli.Nombre, JSON.stringify(calc.lineas), calc.total, 'Nuevo',
                  String(req.notas || '').slice(0, 500), '', 'NO', ahora]);
    return { id: id, total: calc.total, lineas: calc.lineas };
  } finally { lock.releaseLock(); }
}

function cambiarEstado(id, estado, notas) {
  if (ESTADOS.indexOf(estado) < 0) throw new Error('Estado no válido');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = hoja('Pedidos'); const vals = sh.getDataRange().getValues(); const head = vals[0];
    const i = vals.findIndex((r, k) => k > 0 && r[0] === id); if (i < 0) throw new Error('Pedido no encontrado');
    const col = h => head.indexOf(h);
    const descontado = si(vals[i][col('Stock descontado')]);
    const det = JSON.parse(vals[i][col('Detalle')] || '[]');
    const necesitaStock = ESTADOS_CON_STOCK.indexOf(estado) >= 0;
    if (necesitaStock && !descontado) {
      det.forEach(l => moverStock(l.id, -l.cantidad, 'Salida pedido', id));
      sh.getRange(i + 1, col('Stock descontado') + 1).setValue('SI');
    } else if (!necesitaStock && descontado) {
      det.forEach(l => moverStock(l.id, l.cantidad, 'Devolución', id + ' (' + estado + ')'));
      sh.getRange(i + 1, col('Stock descontado') + 1).setValue('NO');
    }
    sh.getRange(i + 1, col('Estado') + 1).setValue(estado);
    if (notas !== undefined) sh.getRange(i + 1, col('Notas internas') + 1).setValue(notas);
    sh.getRange(i + 1, col('Actualizado') + 1).setValue(new Date());
    return true;
  } finally { lock.releaseLock(); }
}

/* =========================== STOCK =========================== */

function moverStock(prodId, delta, tipo, motivo) {
  const sh = hoja('Productos'); const vals = sh.getDataRange().getValues(); const head = vals[0];
  const cs = head.indexOf('Stock');
  const i = vals.findIndex((r, k) => k > 0 && String(r[0]) === String(prodId)); if (i < 0) return null;
  const nuevo = (Number(vals[i][cs]) || 0) + delta;
  sh.getRange(i + 1, cs + 1).setValue(nuevo);
  hoja('Movimientos').appendRow([new Date(), prodId, vals[i][head.indexOf('Producto')], tipo, delta, nuevo, motivo]);
  return nuevo;
}

function ajustarStock(id, cantidad, tipo, motivo) {
  if (!cantidad) throw new Error('Cantidad inválida');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    let delta = cantidad;
    if (tipo === 'Recuento') { // fija el stock al valor contado
      const p = leer('Productos').find(x => String(x.ID) === String(id));
      delta = cantidad - (Number(p.Stock) || 0);
    }
    return moverStock(id, delta, tipo, motivo);
  } finally { lock.releaseLock(); }
}

/* =========================== PRESUPUESTOS =========================== */

function guardarPresupuesto(req) {
  const extra = Number(req.descuentoExtra) || 0;
  const calc = calcularLineas(req.lineas, tarifaDesc(req.tarifa));
  const total = r2(calc.total * (1 - extra / 100));
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = hoja('Presupuestos');
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => r[0]) : [];
    const id = siguienteId(ids, 'PRE-', 4); const hoy = new Date();
    const valido = new Date(hoy.getTime() + (Number(cfg('Validez presupuesto (días)')) || 15) * 86400000);
    sh.appendRow([id, hoy, req.cliente || '', JSON.stringify(calc.lineas), extra, total, valido, 'Enviado', req.notas || '']);
    return { id: id, total: total, subtotal: calc.total, lineas: calc.lineas, valido: iso(valido), fecha: iso(hoy) };
  } finally { lock.releaseLock(); }
}

function presupuestoAPedido(id) {
  const pr = leer('Presupuestos').find(p => p.ID === id); if (!pr) throw new Error('Presupuesto no encontrado');
  const cli = leer('Clientes').find(c => c.Nombre === pr.Cliente || c.ID === pr.Cliente);
  const extra = Number(pr['Descuento extra %']) || 0;
  const det = JSON.parse(pr.Detalle || '[]').map(l => {
    const precio = r2(l.precio * (1 - extra / 100));
    return Object.assign({}, l, { precio: precio, subtotal: r2(precio * l.cantidad) });
  });
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = hoja('Pedidos');
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => r[0]) : [];
    const pid = siguienteId(ids, 'PED-', 4); const ahora = new Date();
    sh.appendRow([pid, ahora, cli ? cli.ID : '', cli ? cli.Nombre : pr.Cliente, JSON.stringify(det), pr.Total, 'Nuevo', '', 'Desde ' + id, 'NO', ahora]);
  } finally { lock.releaseLock(); }
  guardarFila('Presupuestos', 'ID', { ID: id, Estado: 'Aceptado' }, null);
  return true;
}
