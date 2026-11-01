/* Código compartido por la app de clientes y la de gestión */
(function () {
  const params = new URLSearchParams(location.search);
  const DEMO = !window.API_URL || params.get('demo') === '1';
  window.DEMO = DEMO;

  /* ---------------- Llamada a la API ---------------- */
  window.api = async function (accion, datos) {
    const req = Object.assign({ accion }, datos || {});
    if (DEMO) { await new Promise(r => setTimeout(r, 150)); return Mock.llamar(req); }
    const r = await fetch(window.API_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req)
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'Error');
    return j.data;
  };

  /* ---------------- Utilidades ---------------- */
  window.U = {
    dinero(n, moneda) {
      const v = Number(n) || 0;
      return (moneda || '$') + ' ' + v.toLocaleString('es-AR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
    },
    fecha(s, conHora) {
      if (!s) return '';
      const d = new Date(String(s).length <= 10 ? s + 'T12:00:00' : s);
      if (isNaN(d)) return String(s);
      const f = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
      return conHora ? f + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : f;
    },
    esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
    img(src) { return src || 'img/esponja.svg'; },
    si(v) { return v === true || ['SI', 'SÍ', 'TRUE'].includes(String(v).trim().toUpperCase()); },
    r2(n) { return Math.round(Number(n) * 100) / 100; },
    toast(msg, tipo) {
      let t = document.getElementById('toast');
      if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
      t.textContent = msg; t.className = 'show ' + (tipo || '');
      clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 2800);
    },
    wa(numero, texto) {
      const n = String(numero || '').replace(/\D/g, '');
      return 'https://wa.me/' + n + '?text=' + encodeURIComponent(texto);
    },
    /** Precio unitario del lado del cliente (el servidor recalcula al guardar). ofertas en formato catálogo */
    precioCatalogo(p, cant) {
      let mejor = p.precio, oferta = null;
      (p.ofertas || []).forEach(o => {
        if (cant < (o.min || 1)) return;
        const v = o.tipo.indexOf('PRECIO') === 0 ? o.valor : U.r2(p.precioLista * (1 - o.valor / 100));
        if (v < mejor) { mejor = v; oferta = o.titulo; }
      });
      return { precio: mejor, oferta };
    },
    /** Achica una foto (cámara o galería) a JPEG de máx. `max` px y devuelve data URL */
    async foto(file, max) {
      max = max || 900;
      const url = URL.createObjectURL(file);
      try {
        const img = await new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('No se pudo leer la imagen')); i.src = url; });
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.82);
      } finally { URL.revokeObjectURL(url); }
    },
    /** Valida CUIT (11 dígitos con dígito verificador) o DNI (7-8 dígitos) */
    docValido(v) {
      const d = String(v || '').replace(/\D/g, '');
      if (d.length === 7 || d.length === 8) return true;
      if (d.length !== 11) return false;
      const w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]; let s = 0;
      for (let i = 0; i < 10; i++) s += Number(d[i]) * w[i];
      let dv = 11 - (s % 11); if (dv === 11) dv = 0; if (dv === 10) dv = 9;
      return dv === Number(d[10]);
    },
    CAMPOS_CLIENTE: ['Razón social', 'CUIT/DNI', 'Condición IVA', 'Dirección fiscal', 'Localidad', 'Provincia', 'CP', 'Contacto', 'Teléfono', 'Email', 'Dirección'],
    OBLIGATORIOS: ['Razón social', 'CUIT/DNI', 'Condición IVA', 'Dirección fiscal', 'Localidad', 'Teléfono'],
    CONDICIONES_IVA: ['Responsable Inscripto', 'Monotributista', 'Exento', 'Consumidor Final'],
    textoOferta(o, moneda) {
      const v = o.tipo.indexOf('PRECIO') === 0 ? U.dinero(o.valor, moneda) : o.valor + '% off';
      return v + (o.min > 1 ? ' llevando ' + o.min + '+' : '');
    }
  };

  if (DEMO) document.addEventListener('DOMContentLoaded', () => {
    const b = document.createElement('div'); b.className = 'demo-banner';
    b.innerHTML = 'MODO DEMO · datos de prueba en este navegador · <a href="#" id="demoReset">reiniciar</a>';
    document.body.prepend(b);
    document.getElementById('demoReset').onclick = e => { e.preventDefault(); localStorage.removeItem('pl_demo'); location.reload(); };
  });

  /* ---------------- MOCK (modo demo, imita Code.gs) ---------------- */
  const SEMILLA = () => ({
    Productos: [
      ['P001', 'Lavandina', 'Lavandina concentrada para desinfectar y blanquear', 'Químicos', 'Bidón 5 L', 4500, 40, 10, 'img/lavandina.svg'],
      ['P002', 'Desodorante p/piso', 'Limpiador perfumado para pisos', 'Químicos', 'Bidón 5 L', 5200, 30, 8, 'img/desodorante-piso.svg'],
      ['P003', 'Detergente', 'Detergente lavavajillas concentrado', 'Químicos', 'Bidón 5 L', 6000, 35, 8, 'img/detergente.svg'],
      ['P004', 'Rejilla', 'Rejilla de algodón para cocina', 'Paños', 'Unidad', 900, 100, 20, 'img/rejilla.svg'],
      ['P005', 'Trapo de piso', 'Trapo de piso de algodón gris', 'Paños', 'Unidad', 1300, 80, 20, 'img/trapo-piso.svg'],
      ['P006', 'Esponja', 'Esponja doble faz (lado abrasivo verde)', 'Accesorios', 'Unidad', 600, 120, 30, 'img/esponja.svg'],
      ['P007', 'Esponja de acero', 'Virulana / esponja de acero inoxidable', 'Accesorios', 'Unidad', 700, 90, 20, 'img/esponja-acero.svg'],
      ['P008', 'Haragán', 'Secador de piso de goma con cabo', 'Utensilios', 'Unidad', 4200, 25, 5, 'img/haragan.svg'],
      ['P009', 'Escobillón', 'Escobillón de cerdas con cabo', 'Utensilios', 'Unidad', 4800, 25, 5, 'img/escobillon.svg'],
      ['P010', 'Bolsa de residuo', 'Bolsas de residuo negras 60x90', 'Descartables', 'Paquete x10', 1500, 60, 15, 'img/bolsa-residuo.svg']
    ].map(r => ({ ID: r[0], Producto: r[1], 'Descripción': r[2], 'Categoría': r[3], Unidad: r[4], Precio: r[5], Stock: r[6], 'Stock mínimo': r[7], Imagen: r[8], Activo: 'SI' })),
    Clientes: [{ ID: 'C001', Nombre: 'Cliente de prueba', Contacto: 'Nombre contacto', 'Teléfono': '', Email: '', 'Dirección': '', 'Código acceso': 'PRUEBA1', Tarifa: 'General', Activo: 'SI' }],
    Tarifas: [{ Tarifa: 'General', 'Descuento %': 0, Notas: 'Precio de lista' }, { Tarifa: 'Mayorista', 'Descuento %': 10, Notas: 'Clientes con volumen' }, { Tarifa: 'Distribuidor', 'Descuento %': 18, Notas: 'Revendedores' }],
    Ofertas: [{ ID: 'O001', 'Producto ID': 'P001', 'Título': 'Lavandina: 15% llevando 6 o más', Tipo: 'PORCENTAJE', Valor: 15, 'Cantidad mínima': 6, Desde: '2026-11-01', Hasta: '2026-12-31', Activa: 'SI' }],
    Pedidos: [], Presupuestos: [], Movimientos: [],
    Config: { 'Empresa': 'Mi Empresa de Limpieza', 'PIN admin': '1234', 'Moneda': '$', 'WhatsApp': '', 'Validez presupuesto (días)': 15 }
  });

  const Mock = {
    db: null,
    cargar() { if (!this.db) { try { this.db = JSON.parse(localStorage.getItem('pl_demo')); } catch (e) { } if (!this.db) this.db = SEMILLA(); } return this.db; },
    guardar() { localStorage.setItem('pl_demo', JSON.stringify(this.db)); },
    llamar(req) {
      this.db = null; const db = this.cargar(); const ahora = () => new Date().toISOString().slice(0, 19);
      const cli = (pend) => { const c = db.Clientes.find(x => String(x['Código acceso']).toUpperCase() === String(req.codigo || '').trim().toUpperCase()); if (!c) throw new Error('Código de cliente no válido');
        if (c.Activo === 'PENDIENTE') { if (pend) return c; throw new Error('PENDIENTE: tu alta está pendiente de aprobación. Te avisamos cuando puedas hacer pedidos.'); }
        if (!U.si(c.Activo)) throw new Error('Código de cliente no válido'); return c; };
      const completos = c => U.OBLIGATORIOS.every(k => String(c[k] || '').trim());
      const limpiar = d => { const o = {}; U.CAMPOS_CLIENTE.forEach(k => { if (d && d[k] !== undefined) o[k] = String(d[k]).trim(); }); if (o['CUIT/DNI']) o['CUIT/DNI'] = o['CUIT/DNI'].replace(/\D/g, ''); return o; };
      const validar = (it, id) => { const f = U.OBLIGATORIOS.filter(k => !it[k]); if (f.length) throw new Error('Faltan datos: ' + f.join(', '));
        if (db.Clientes.find(c => String(c['CUIT/DNI'] || '') === it['CUIT/DNI'] && c.ID !== id)) throw new Error('Ya hay un cliente registrado con ese CUIT/DNI. Pedinos tu código de acceso.'); };
      const publicos = c => { const o = { id: c.ID, codigo: c['Código acceso'], pendiente: c.Activo === 'PENDIENTE', completos: completos(c), datos: {} }; U.CAMPOS_CLIENTE.forEach(k => o.datos[k] = c[k] || ''); if (!o.datos['Razón social']) o.datos['Razón social'] = c.Nombre || ''; return o; };
      const desc = t => { const x = db.Tarifas.find(y => y.Tarifa === t); return x ? Number(x['Descuento %']) || 0 : 0; };
      const hoy = new Date().toISOString().slice(0, 10);
      const vigentes = () => db.Ofertas.filter(o => U.si(o.Activa) && (!o.Desde || String(o.Desde).slice(0, 10) <= hoy) && (!o.Hasta || String(o.Hasta).slice(0, 10) >= hoy));
      const pu = (p, cant, d, ofs) => { const base = Number(p.Precio); let m = U.r2(base * (1 - d / 100)), of = null; ofs.filter(o => o['Producto ID'] === p.ID).forEach(o => { if (cant < (Number(o['Cantidad mínima']) || 1)) return; const v = String(o.Tipo).toUpperCase().indexOf('PRECIO') === 0 ? Number(o.Valor) : U.r2(base * (1 - o.Valor / 100)); if (v < m) { m = v; of = o['Título']; } }); return { precio: m, base, oferta: of }; };
      const calc = (lineas, d) => { const ofs = vigentes(); let tot = 0; const l = (lineas || []).filter(x => x.cantidad > 0).map(x => { const p = db.Productos.find(y => y.ID === x.id); if (!p) return null; const u = pu(p, Number(x.cantidad), d, ofs); const s = U.r2(u.precio * x.cantidad); tot += s; return { id: p.ID, nombre: p.Producto, unidad: p.Unidad, cantidad: Number(x.cantidad), precioLista: u.base, precio: u.precio, oferta: u.oferta, subtotal: s }; }).filter(Boolean); return { lineas: l, total: U.r2(tot) }; };
      const sigId = (arr, pre, w) => pre + String(arr.reduce((m, r) => Math.max(m, Number(String(r.ID).match(/(\d+)$/)?.[1] || 0)), 0) + 1).padStart(w, '0');
      const mover = (id, delta, tipo, motivo) => { const p = db.Productos.find(x => x.ID === id); if (!p) return; p.Stock = Number(p.Stock) + delta; db.Movimientos.push({ Fecha: ahora(), 'Producto ID': id, Producto: p.Producto, Tipo: tipo, Cantidad: delta, 'Stock resultante': p.Stock, Motivo: motivo }); return p.Stock; };
      const upsert = (tabla, clave, item, pre) => { if (!item[clave] && pre) item[clave] = sigId(db[tabla], pre, 3); const i = db[tabla].findIndex(r => String(r[clave]) === String(item[clave])); if (i >= 0) Object.assign(db[tabla][i], item); else db[tabla].push(item); return item; };
      const conStock = ['Confirmado', 'Preparado', 'Enviado', 'Entregado'];
      if (!['catalogo', 'crearPedido', 'misPedidos', 'info', 'misDatos', 'guardarMisDatos', 'registrarCliente'].includes(req.accion) && String(req.pin) !== String(db.Config['PIN admin'])) throw new Error('PIN incorrecto');
      let r;
      switch (req.accion) {
        case 'info': r = { empresa: db.Config.Empresa, moneda: db.Config.Moneda, whatsapp: db.Config.WhatsApp }; break;
        case 'catalogo': { const c = cli(); const d = desc(c.Tarifa); const ofs = vigentes();
          r = { cliente: { id: c.ID, nombre: c.Nombre, tarifa: c.Tarifa, datosCompletos: completos(c) }, empresa: db.Config.Empresa, moneda: db.Config.Moneda, whatsapp: db.Config.WhatsApp,
            productos: db.Productos.filter(p => U.si(p.Activo)).map(p => ({ id: p.ID, nombre: p.Producto, descripcion: p['Descripción'], categoria: p['Categoría'], unidad: p.Unidad, imagen: p.Imagen, precioLista: Number(p.Precio), precio: pu(p, 1, d, ofs).precio, ofertas: ofs.filter(o => o['Producto ID'] === p.ID).map(o => ({ titulo: o['Título'], tipo: String(o.Tipo).toUpperCase(), valor: Number(o.Valor), min: Number(o['Cantidad mínima']) || 1, hasta: o.Hasta })), disponibilidad: p.Stock <= 0 ? 'sin' : p.Stock <= p['Stock mínimo'] ? 'poco' : 'ok', tarifaDesc: d })) }; break; }
        case 'crearPedido': { const c = cli(); if (!completos(c)) throw new Error('Completá tus datos de facturación antes de enviar el pedido'); const k = calc(req.lineas, desc(c.Tarifa)); if (!k.lineas.length) throw new Error('El pedido está vacío');
          const id = sigId(db.Pedidos, 'PED-', 4); db.Pedidos.push({ ID: id, Fecha: ahora(), 'Cliente ID': c.ID, Cliente: c.Nombre, Detalle: k.lineas, Total: k.total, Estado: 'Nuevo', 'Notas cliente': req.notas || '', 'Notas internas': '', 'Stock descontado': 'NO', Actualizado: ahora() });
          r = { id, total: k.total, lineas: k.lineas }; break; }
        case 'misPedidos': { const c = cli(); r = db.Pedidos.filter(p => p['Cliente ID'] === c.ID).slice().reverse(); break; }
        case 'misDatos': r = publicos(cli(true)); break;
        case 'guardarMisDatos': { const c = cli(true); const it = limpiar(req.datos); validar(it, c.ID); it['Datos actualizados'] = ahora(); Object.assign(c, it); r = publicos(c); break; }
        case 'registrarCliente': { const it = limpiar(req.datos); validar(it, null);
          Object.assign(it, { Nombre: it['Razón social'], Tarifa: 'General', Activo: 'PENDIENTE', 'Código acceso': Math.random().toString(36).slice(2, 8).toUpperCase(), 'Fecha alta': ahora(), 'Datos actualizados': ahora() });
          upsert('Clientes', 'ID', it, 'C'); r = { codigo: it['Código acceso'], pendiente: true }; break; }
        case 'subirFoto': r = { url: req.base64 }; break;
        case 'login': r = { ok: true }; break;
        case 'todo': r = { config: db.Config, productos: db.Productos, clientes: db.Clientes, tarifas: db.Tarifas, ofertas: db.Ofertas, pedidos: db.Pedidos.slice().reverse(), presupuestos: db.Presupuestos.slice().reverse(), movimientos: db.Movimientos.slice().reverse(), estados: ['Nuevo', 'Confirmado', 'Preparado', 'Enviado', 'Entregado', 'Cancelado'] }; break;
        case 'guardarProducto': r = upsert('Productos', 'ID', req.item, 'P'); break;
        case 'guardarCliente': if (req.item['Código acceso'] === '' || (!req.item.ID && !req.item['Código acceso'])) req.item['Código acceso'] = Math.random().toString(36).slice(2, 8).toUpperCase();
          if (req.item['Código acceso'] && db.Clientes.find(c => String(c['Código acceso']).toUpperCase() === String(req.item['Código acceso']).toUpperCase() && c.ID !== req.item.ID)) throw new Error('Ese código de acceso ya está en uso');
          r = upsert('Clientes', 'ID', req.item, 'C'); break;
        case 'guardarTarifa': r = upsert('Tarifas', 'Tarifa', req.item); break;
        case 'borrarTarifa': db.Tarifas = db.Tarifas.filter(t => t.Tarifa !== req.id); r = true; break;
        case 'guardarOferta': r = upsert('Ofertas', 'ID', req.item, 'O'); break;
        case 'borrarOferta': db.Ofertas = db.Ofertas.filter(t => t.ID !== req.id); r = true; break;
        case 'ajustarStock': { let d = Number(req.cantidad); if (req.tipo === 'Recuento') d = d - Number(db.Productos.find(p => p.ID === req.id).Stock); r = mover(req.id, d, req.tipo, req.motivo || ''); break; }
        case 'estadoPedido': { const p = db.Pedidos.find(x => x.ID === req.id); const nec = conStock.includes(req.estado); const des = U.si(p['Stock descontado']);
          if (nec && !des) { p.Detalle.forEach(l => mover(l.id, -l.cantidad, 'Salida pedido', p.ID)); p['Stock descontado'] = 'SI'; }
          else if (!nec && des) { p.Detalle.forEach(l => mover(l.id, l.cantidad, 'Devolución', p.ID + ' (' + req.estado + ')')); p['Stock descontado'] = 'NO'; }
          p.Estado = req.estado; if (req.notas !== undefined) p['Notas internas'] = req.notas; p.Actualizado = ahora(); r = true; break; }
        case 'guardarPresupuesto': { const k = calc(req.lineas, desc(req.tarifa)); const ex = Number(req.descuentoExtra) || 0; const tot = U.r2(k.total * (1 - ex / 100));
          const id = sigId(db.Presupuestos, 'PRE-', 4); const val = new Date(Date.now() + (Number(db.Config['Validez presupuesto (días)']) || 15) * 864e5).toISOString().slice(0, 10);
          db.Presupuestos.push({ ID: id, Fecha: ahora(), Cliente: req.cliente || '', Detalle: k.lineas, 'Descuento extra %': ex, Total: tot, 'Válido hasta': val, Estado: 'Enviado', Notas: req.notas || '' });
          r = { id, total: tot, subtotal: k.total, lineas: k.lineas, valido: val, fecha: ahora() }; break; }
        case 'presupuestoAPedido': { const pr = db.Presupuestos.find(p => p.ID === req.id); const c = db.Clientes.find(x => x.Nombre === pr.Cliente || x.ID === pr.Cliente); const ex = Number(pr['Descuento extra %']) || 0;
          const det = pr.Detalle.map(l => Object.assign({}, l, { precio: U.r2(l.precio * (1 - ex / 100)), subtotal: U.r2(l.precio * (1 - ex / 100) * l.cantidad) }));
          db.Pedidos.push({ ID: sigId(db.Pedidos, 'PED-', 4), Fecha: ahora(), 'Cliente ID': c ? c.ID : '', Cliente: c ? c.Nombre : pr.Cliente, Detalle: det, Total: pr.Total, Estado: 'Nuevo', 'Notas cliente': '', 'Notas internas': 'Desde ' + pr.ID, 'Stock descontado': 'NO', Actualizado: ahora() });
          pr.Estado = 'Aceptado'; r = true; break; }
        case 'guardarConfig': Object.assign(db.Config, req.item); r = db.Config; break;
        case 'calcular': r = calc(req.lineas, desc(req.tarifa)); break;
        default: throw new Error('Acción desconocida');
      }
      this.guardar();
      return JSON.parse(JSON.stringify(r));
    }
  };
  window.Mock = Mock;
})();
