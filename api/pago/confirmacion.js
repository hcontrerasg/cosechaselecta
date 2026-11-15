// POST /api/pago/confirmacion  (lo llama Flow, servidor a servidor, con token)
// Fuente de verdad del pago: se consulta el estado a Flow y se registra.
const { getStatus, STATUS } = require('../../lib/flow');
const avisar = require('../../lib/avisar');

module.exports = async (req, res) => {
  const token = (req.body && req.body.token) || (req.query && req.query.token);
  if (!token) return res.status(400).send('token requerido');
  try {
    const s = await getStatus(token);
    let opt = {};
    try { opt = typeof s.optional === 'string' ? JSON.parse(s.optional) : (s.optional || {}); } catch {}
    const estado = STATUS[s.status] || String(s.status);
    console.log('PAGO', JSON.stringify({
      estado, pedido: opt.pedido, nombre: opt.nombre, monto: s.amount, email: s.payer,
      flowOrder: s.flowOrder, commerceOrder: s.commerceOrder,
      medio: s.paymentData && s.paymentData.media, fecha: s.paymentData && s.paymentData.date,
    }));
    if (s.status !== 1) { // pendiente no se avisa; Flow vuelve a llamar cuando cambia
      await avisar('pago', {
        'N° de pedido': opt.pedido || s.commerceOrder, 'Estado del pago': estado,
        'Monto': '$' + Number(s.amount || 0).toLocaleString('es-CL'), 'Correo': s.payer || '', 'Nombre': opt.nombre || '',
        'Medio de pago': (s.paymentData && s.paymentData.media) || '', 'Orden Flow': String(s.flowOrder || ''),
      }, 'flow.cl');
    }
    return res.status(200).send('OK');
  } catch (e) {
    console.error('confirmacion', e.message);
    return res.status(500).send('error');
  }
};
