// Reenvía un aviso por el mismo camino que los formularios (api/contacto.js):
// correo con Resend + fila en la hoja de Google + log FORMULARIO.
const contacto = require('../api/contacto.js');

module.exports = function avisar(tipo, campos, pagina) {
  return new Promise(resolve => {
    const res = {
      statusCode: 200,
      setHeader() {},
      status(c) { this.statusCode = c; return this; },
      json(o) { resolve(this.statusCode < 400 && o && o.ok); return this; },
    };
    Promise.resolve(contacto({ method: 'POST', body: { tipo, campos, pagina: pagina || 'cosechaselecta.com/checkout' } }, res))
      .catch(e => { console.error('aviso', e && e.message); resolve(false); });
  });
};
