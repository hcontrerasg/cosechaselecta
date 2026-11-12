// Recibe los formularios del sitio y los envía por correo con Resend.
// Variables de entorno (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY  clave de https://resend.com (obligatoria)
//   MAIL_TO         destino (por defecto hector.contreras@cosechaselecta.com)
//   MAIL_FROM       remitente (por defecto "CosechaSelecta <onboarding@resend.dev>";
//                   cambiar a web@cosechaselecta.com cuando el dominio esté verificado en Resend)

const TO = process.env.MAIL_TO || 'hector.contreras@cosechaselecta.com';
const FROM = process.env.MAIL_FROM || 'CosechaSelecta Web <onboarding@resend.dev>';

const TIPOS = {
  pedido: 'Pedido semanal / cuenta de negocio',
  reserva: 'Reserva desde el carrito',
  agricultor: 'Agricultor quiere vender',
  exportacion: 'Solicitud de exportación',
  contacto: 'Contacto',
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = v => (Array.isArray(v) ? v.join(', ') : String(v ?? '')).trim().slice(0, 4000);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object') return res.status(400).json({ ok: false, error: 'Datos inválidos' });

  // Trampa para bots: campo oculto que una persona nunca llena.
  if (body._web) return res.status(200).json({ ok: true });

  const tipo = TIPOS[body.tipo] ? body.tipo : 'contacto';
  const campos = body.campos && typeof body.campos === 'object' ? body.campos : {};
  const filas = Object.entries(campos).slice(0, 60)
    .map(([k, v]) => [clean(k).slice(0, 80), clean(v)])
    .filter(([, v]) => v);
  if (!filas.length) return res.status(400).json({ ok: false, error: 'Formulario vacío' });

  const get = re => (filas.find(([k]) => re.test(k)) || [])[1] || '';
  const quien = get(/negocio|empresa|nombre/i) || 'sin nombre';
  const correo = get(/correo|email/i);
  const asunto = `[Web] ${TIPOS[tipo]} · ${quien}`.slice(0, 180);

  console.log('FORMULARIO', JSON.stringify({ tipo, campos: Object.fromEntries(filas), at: new Date().toISOString() }));

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#14211A">
<h2 style="color:#2E6447;margin:0 0 12px">${esc(TIPOS[tipo])}</h2>
<table cellpadding="6" style="border-collapse:collapse">${filas.map(([k, v]) =>
    `<tr><td style="border-bottom:1px solid #e3e7e4;font-weight:bold;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="border-bottom:1px solid #e3e7e4;white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table>
<p style="color:#55645B;font-size:12px;margin-top:16px">Enviado desde ${esc(clean(body.pagina) || 'cosechaselecta.com')} · ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</p></div>`;
  const text = filas.map(([k, v]) => `${k}: ${v}`).join('\n');

  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error('FORMULARIO sin RESEND_API_KEY: no se envió correo'); return res.status(503).json({ ok: false, error: 'Correo no configurado' }); }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM, to: [TO], subject: asunto, html, text,
        ...(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ? { reply_to: correo } : {}),
      }),
    });
    if (!r.ok) { console.error('FORMULARIO error Resend', r.status, await r.text()); return res.status(502).json({ ok: false, error: 'No se pudo enviar' }); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('FORMULARIO error', e && e.message);
    return res.status(502).json({ ok: false, error: 'No se pudo enviar' });
  }
};
