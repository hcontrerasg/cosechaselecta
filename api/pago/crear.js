// POST /api/pago/crear  { pedido, monto, email, nombre? }  ->  { url }
// Crea un pago en Flow y devuelve la URL a la que se redirige al cliente.
const { createPayment, siteUrl } = require('../../lib/flow');

const MIN = 1000, MAX = 50000000; // CLP

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const pedido = String(b.pedido || '').trim().replace(/[^A-Za-z0-9-]/g, '').slice(0, 30);
  const email = String(b.email || '').trim().slice(0, 120);
  const nombre = String(b.nombre || '').trim().slice(0, 80);
  const monto = Math.round(Number(String(b.monto || '').replace(/[^\d]/g, '')));

  if (!pedido) return res.status(400).json({ error: 'Indica el número de pedido.' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Revisa el correo.' });
  if (!(monto >= MIN && monto <= MAX)) return res.status(400).json({ error: 'El monto debe estar entre $1.000 y $50.000.000.' });

  const site = siteUrl(req);
  try {
    const r = await createPayment({
      // Flow exige un commerceOrder único por intento de pago.
      commerceOrder: `${pedido}-${Date.now().toString(36)}`,
      subject: `CosechaSelecta · Pedido ${pedido}`,
      currency: 'CLP',
      amount: String(monto),
      email,
      urlConfirmation: `${site}/api/pago/confirmacion`,
      urlReturn: `${site}/api/pago/retorno`,
      optional: JSON.stringify({ pedido, nombre }),
    });
    return res.status(200).json({ url: `${r.url}?token=${r.token}` });
  } catch (e) {
    console.error('crear pago', e.message);
    return res.status(502).json({ error: 'No pudimos iniciar el pago. Intenta de nuevo en unos minutos.' });
  }
};
