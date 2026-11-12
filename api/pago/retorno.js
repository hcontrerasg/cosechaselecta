// POST /api/pago/retorno  (Flow devuelve aquí al cliente con token)
// Consulta el estado y redirige a la página de resultado.
const { getStatus, STATUS } = require('../../lib/flow');

module.exports = async (req, res) => {
  const token = (req.body && req.body.token) || (req.query && req.query.token);
  let estado = 'pendiente', pedido = '';
  if (token) {
    try {
      const s = await getStatus(token);
      estado = STATUS[s.status] || 'pendiente';
      try { pedido = JSON.parse(s.optional || '{}').pedido || ''; } catch {}
    } catch (e) { console.error('retorno', e.message); }
  }
  const q = new URLSearchParams({ estado, pedido });
  res.statusCode = 303;
  res.setHeader('Location', `/pago-resultado.html?${q}`);
  res.end();
};
