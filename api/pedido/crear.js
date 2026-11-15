// POST /api/pedido/crear
// { items:[{t,n,f,cal,q}], cliente:{contacto,email,telefono,direccion,comuna,notas},
//   documento:{tipo:'boleta'} | {tipo:'factura',nombre,rut,telefono,giro,direccion}, pago:'flow'|'contra' }
// Recalcula el total con los precios de index.html (lib/precios.js), avisa por correo y hoja
// (como los demás formularios) y, si corresponde, abre el pago en Flow.
const { cotizar, pagableEnLinea } = require('../../lib/precios');
const { createPayment, siteUrl } = require('../../lib/flow');
const rut = require('../../lib/rut');
const avisar = require('../../lib/avisar');

const txt = (v, n) => String(v || '').trim().slice(0, n);
const clp = v => '$' + Math.round(v).toLocaleString('es-CL');
const nf = v => String(Math.round(v * 10) / 10).replace('.', ',');

function numeroPedido() {
  const d = new Date(Date.now() - 3 * 3600e3); // fecha aproximada de Chile para el prefijo
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  return `CS-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const lineaTxt = l => `${l.n} · ${l.cal} · ${l.t === 'd' ? `${nf(l.q)} ${l.unidad} (al detalle)` : `${l.q} × ${l.f} (mayorista)`}`
  + (l.precio != null ? ` × ${clp(l.precio)} = ${clp(l.subtotal)}` : ' · precio por confirmar');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }

  const c = cotizar(b.items);
  if (!c.lineas.length) return res.status(400).json({ error: 'Tu carrito está vacío.' });

  const k = b.cliente || {};
  const cliente = {
    contacto: txt(k.contacto, 80), email: txt(k.email, 120), telefono: txt(k.telefono, 20),
    direccion: txt(k.direccion, 150), comuna: txt(k.comuna, 60), notas: txt(k.notas, 500),
  };
  for (const f of ['contacto', 'email', 'telefono', 'direccion', 'comuna'])
    if (!cliente[f]) return res.status(400).json({ error: 'Completa los campos obligatorios.' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente.email)) return res.status(400).json({ error: 'Revisa el correo.' });

  const d = b.documento || {};
  let documento = { tipo: 'boleta' };
  if (d.tipo === 'factura') {
    documento = { tipo: 'factura', nombre: txt(d.nombre, 100), rut: txt(d.rut, 15), telefono: txt(d.telefono, 20), giro: txt(d.giro, 120), direccion: txt(d.direccion, 150) };
    for (const f of ['nombre', 'rut', 'telefono', 'giro', 'direccion'])
      if (!documento[f]) return res.status(400).json({ error: 'Completa los datos para facturar.' });
    if (!rut.valido(documento.rut)) return res.status(400).json({ error: 'Revisa el RUT de facturación.' });
    documento.rut = rut.formato(documento.rut);
  }

  // Pago en línea si todos los productos tienen precio (con despacho $3.990 bajo FREE_RM).
  const pago = b.pago === 'flow' && pagableEnLinea(c) ? 'flow' : 'contra';
  const pedido = numeroPedido();
  console.log('PEDIDO', JSON.stringify({ pedido, pago, cliente, documento, ...c }));

  const campos = {
    'N° de pedido': pedido,
    'Forma de pago': pago === 'flow' ? 'En línea con Flow (pendiente hasta que Flow confirme)' : 'Contra entrega',
    'Contacto': cliente.contacto, 'Teléfono': cliente.telefono, 'Correo': cliente.email,
    'Dirección de entrega': cliente.direccion, 'Comuna': cliente.comuna, 'Notas': cliente.notas,
    'Documento': documento.tipo === 'factura' ? 'Factura' : 'Boleta',
    ...(documento.tipo === 'factura' ? {
      'Factura: nombre o razón social': documento.nombre, 'Factura: RUT': documento.rut, 'Factura: teléfono': documento.telefono,
      'Factura: giro': documento.giro, 'Factura: dirección': documento.direccion,
    } : {}),
    'Pedido (carrito)': c.lineas.map(lineaTxt).join('\n'),
    'Productos': clp(c.total) + (c.todoConPrecio ? '' : ' + productos con precio por confirmar'),
    'Despacho': c.despacho ? clp(c.despacho) : 'Gratis (RM)',
    'Total': clp(c.totalConDespacho) + (c.todoConPrecio ? '' : ' + por confirmar'),
  };
  await avisar('reserva', campos);

  if (pago === 'contra') return res.status(200).json({ pedido, total: c.totalConDespacho, redirect: `/pago-resultado.html?estado=reservado&pedido=${pedido}` });

  const site = siteUrl(req);
  try {
    const r = await createPayment({
      commerceOrder: pedido,
      subject: `CosechaSelecta · Pedido ${pedido} · Productos ${clp(c.total)} + despacho ${c.despacho ? clp(c.despacho) : '$0 (gratis)'}`,
      currency: 'CLP',
      amount: String(c.totalConDespacho),
      email: cliente.email,
      urlConfirmation: `${site}/api/pago/confirmacion`,
      urlReturn: `${site}/api/pago/retorno`,
      optional: JSON.stringify({ pedido, nombre: documento.nombre || cliente.contacto }),
    });
    return res.status(200).json({ pedido, total: c.totalConDespacho, redirect: `${r.url}?token=${r.token}` });
  } catch (e) {
    console.error('pedido flow', e.message);
    return res.status(502).json({ pedido, error: `Recibimos tu pedido ${pedido}, pero no pudimos abrir el pago en línea. Te contactaremos para coordinar el pago.` });
  }
};
