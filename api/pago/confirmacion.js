// POST /api/pago/confirmacion  (lo llama Flow, servidor a servidor, con token)
// Fuente de verdad del pago: se consulta el estado a Flow y se registra.
const { getStatus, STATUS } = require('../../lib/flow');

module.exports = async (req, res) => {
  const token = (req.body && req.body.token) || (req.query && req.query.token);
  if (!token) return res.status(400).send('token requerido');
  try {
    const s = await getStatus(token);
    let opt = {};
    try { opt = typeof s.optional === 'string' ? JSON.parse(s.optional) : (s.optional || {}); } catch {}
    console.log('PAGO', JSON.stringify({
      estado: STATUS[s.status] || s.status,
      pedido: opt.pedido, nombre: opt.nombre,
      monto: s.amount, email: s.payer,
      flowOrder: s.flowOrder, commerceOrder: s.commerceOrder,
      medio: s.paymentData && s.paymentData.media,
      fecha: s.paymentData && s.paymentData.date,
    }));
    // TODO: enviar correo de aviso a CosechaSelecta cuando haya proveedor de correo.
    return res.status(200).send('OK');
  } catch (e) {
    console.error('confirmacion', e.message);
    return res.status(500).send('error');
  }
};
