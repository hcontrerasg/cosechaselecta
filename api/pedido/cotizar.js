// POST /api/pedido/cotizar (o GET ?items=[...])  { items:[{t,n,f,cal,q}] }  ->  líneas con precio y totales (calculados en el servidor)
const { cotizar, pagableEnLinea } = require('../../lib/precios');

module.exports = (req, res) => {
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  if (req.method === 'GET') { try { b = { items: JSON.parse((req.query && req.query.items) || '[]') }; } catch { b = {}; } }
  else if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  try {
    const c = cotizar(b.items);
    return res.status(200).json({ ...c, pagable: pagableEnLinea(c) });
  } catch (e) {
    console.error('cotizar', e.message);
    return res.status(500).json({ error: 'No pudimos calcular el pedido.' });
  }
};
