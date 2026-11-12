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
  const todas = Object.entries(campos).slice(0, 60).map(([k, v]) => [clean(k).slice(0, 80), clean(v)]);
  const filas = todas.filter(([, v]) => v);
  if (!filas.length) return res.status(400).json({ ok: false, error: 'Formulario vacío' });

  const get = re => (filas.find(([k]) => re.test(k)) || [])[1] || '';
  const quien = get(/negocio/i) || get(/empresa/i) || get(/nombre|contacto/i) || 'sin nombre';
  const correo = get(/correo|email/i);
  const asunto = `[Web] ${TIPOS[tipo]} · ${quien}`.slice(0, 180);

  console.log('FORMULARIO', JSON.stringify({ tipo, campos: Object.fromEntries(filas), at: new Date().toISOString() }));

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#14211A">
<h2 style="color:#2E6447;margin:0 0 12px">${esc(TIPOS[tipo])}</h2>
<table cellpadding="6" style="border-collapse:collapse">${filas.map(([k, v]) =>
    `<tr><td style="border-bottom:1px solid #e3e7e4;font-weight:bold;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="border-bottom:1px solid #e3e7e4;white-space:pre-wrap">${esc(v)}</td></tr>`).join('')}</table>
<p style="color:#55645B;font-size:12px;margin-top:16px">Enviado desde ${esc(clean(body.pagina) || 'cosechaselecta.com')} · ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</p></div>`;
  const text = filas.map(([k, v]) => `${k}: ${v}`).join('\n');

  const [mailOk, sheetOk] = await Promise.all([enviarCorreo({ asunto, html, text, correo }), guardarEnHoja(tipo, todas)]);
  if (mailOk || sheetOk) return res.status(200).json({ ok: true, correo: mailOk, hoja: sheetOk });
  return res.status(502).json({ ok: false, error: 'No se pudo enviar' });
};

async function enviarCorreo({ asunto, html, text, correo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error('FORMULARIO sin RESEND_API_KEY: no se envió correo'); return false; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM, to: [TO], subject: asunto, html, text,
        ...(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ? { reply_to: correo } : {}),
      }),
    });
    if (!r.ok) { console.error('FORMULARIO error Resend', r.status, await r.text()); return false; }
    return true;
  } catch (e) { console.error('FORMULARIO error Resend', e && e.message); return false; }
}

// Agrega una fila a la hoja de Google (Apps Script, ver hoja/registro-formularios.gs).
//   SHEETS_WEBHOOK_URL  URL de la aplicación web de Apps Script
//   SHEETS_TOKEN        clave compartida (la misma que TOKEN en el script)
async function guardarEnHoja(tipo, filas) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) { console.error('FORMULARIO sin SHEETS_WEBHOOK_URL: no se guardó en la hoja'); return false; }
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        token: process.env.SHEETS_TOKEN || '',
        hoja: TIPOS[tipo],
        fila: { Fecha: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }), ...Object.fromEntries(filas), Estado: 'Nuevo' },
      }),
      redirect: 'follow',
    });
    const t = await r.text();
    if (!r.ok || !/"ok":true/.test(t)) { console.error('FORMULARIO error hoja', r.status, t.slice(0, 300)); return false; }
    return true;
  } catch (e) { console.error('FORMULARIO error hoja', e && e.message); return false; }
}
