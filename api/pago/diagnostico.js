// GET /api/pago/diagnostico
// Revisa si las claves de Flow están cargadas y si Flow las acepta, sin mostrar las claves.
// Consulta un pago inexistente: si Flow responde "Transaction not found" las claves son válidas;
// si responde error de apiKey o firma, las claves están mal.
const { getStatus } = require('../../lib/flow');

module.exports = async (req, res) => {
  const env = process.env.FLOW_ENV === 'production' ? 'production' : 'sandbox';
  const cargadas = { FLOW_API_KEY: !!process.env.FLOW_API_KEY, FLOW_SECRET_KEY: !!process.env.FLOW_SECRET_KEY };
  if (!cargadas.FLOW_API_KEY || !cargadas.FLOW_SECRET_KEY) return res.status(200).json({ env, cargadas, ok: false, mensaje: 'Faltan variables' });
  try {
    await getStatus('DIAGNOSTICO0000000000000000000000000000');
    return res.status(200).json({ env, cargadas, ok: true, mensaje: 'Flow respondió sin error' });
  } catch (e) {
    const m = String(e.message || '');
    const clavesOk = /token|not found|no encontrad/i.test(m) && !/apikey|api key|firma|sign/i.test(m);
    return res.status(200).json({ env, cargadas, ok: clavesOk, respuestaFlow: m.replace(process.env.FLOW_API_KEY || '\0', '***').slice(0, 300) });
  }
};
