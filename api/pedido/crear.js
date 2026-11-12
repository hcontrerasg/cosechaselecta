// POST /api/pedido/crear
// { items:[{n,cal,q}], cliente:{razon,rut,contacto,email,telefono,direccion,comuna,notas}, pago:'flow'|'contra' }
// Recalcula el total con la lista de precios del servidor (no confía en el navegador),
// valida pedido mínimo y datos, y crea el pago en Flow si corresponde.
const CATALOGO = require('../../catalogo.js');
const { createPayment, siteUrl } = require('../../lib/flow');
const rut = require('../../lib/rut');

const txt = (v, n) => String(v || '').trim().slice(0, n);

function numeroPedido() {
  const d = new Date(Date.now() - 3 * 3600e3); // fecha aproximada de Chile para el prefijo
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  return `CS-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }

  const items = Array.isArray(b.items) ? b.items.slice(0, 60) : [];
  const t = CATALOGO.totales(items);
  if (!t.lineas.length) return res.status(400).json({ error: 'Tu carrito está vacío.' });
  if (t.neto < CATALOGO.pedidoMinimo) return res.status(400).json({ error: `El pedido mínimo es $${CATALOGO.pedidoMinimo.toLocaleString('es-CL')} + IVA.` });

  const c = b.cliente || {};
  const cliente = {
    razon: txt(c.razon, 100), rut: txt(c.rut, 15), contacto: txt(c.contacto, 80),
    email: txt(c.email, 120), telefono: txt(c.telefono, 20), direccion: txt(c.direccion, 150),
    comuna: txt(c.comuna, 60), notas: txt(c.notas, 500),
  };
  for (const k of ['razon', 'rut', 'contacto', 'email', 'telefono', 'direccion', 'comuna'])
    if (!cliente[k]) return res.status(400).json({ error: 'Completa los campos obligatorios.' });
  if (!rut.valido(cliente.rut)) return res.status(400).json({ error: 'Revisa el RUT.' });
  cliente.rut = rut.formato(cliente.rut);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cliente.email)) return res.status(400).json({ error: 'Revisa el correo.' });

  const pago = b.pago === 'contra' ? 'contra' : 'flow';
  const pedido = numeroPedido();
  console.log('PEDIDO', JSON.stringify({ pedido, pago, cliente, ...t }));

  if (pago === 'contra') return res.status(200).json({ pedido, total: t.total, redirect: `/pago-resultado.html?estado=reservado&pedido=${pedido}` });

  const site = siteUrl(req);
  try {
    const r = await createPayment({
      commerceOrder: pedido,
      subject: `CosechaSelecta · Pedido ${pedido}`,
      currency: 'CLP',
      amount: String(t.total),
      email: cliente.email,
      urlConfirmation: `${site}/api/pago/confirmacion`,
      urlReturn: `${site}/api/pago/retorno`,
      optional: JSON.stringify({ pedido, nombre: cliente.razon }),
    });
    return res.status(200).json({ pedido, total: t.total, redirect: `${r.url}?token=${r.token}` });
  } catch (e) {
    console.error('pedido flow', e.message);
    return res.status(502).json({ pedido, error: 'Tu pedido quedó registrado, pero no pudimos abrir el pago en línea. Intenta de nuevo o elige pago contra entrega.' });
  }
};
