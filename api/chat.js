// /api/chat — asistente de CosechaSelecta con Claude.
// GET  -> { activo, whatsapp }   (el widget decide qué mostrar)
// POST { messages:[{role:'user'|'assistant', content:'...'}] } -> { reply, whatsapp }
// Variables de entorno (Vercel):
//   ANTHROPIC_API_KEY  (obligatoria para la IA; sin ella el widget muestra solo WhatsApp)
//   WHATSAPP_NUMERO    (ej. 56912345678, sin + ni espacios)
//   CHAT_MODEL         (opcional, por defecto claude-opus-5-5; ej. claude-haiku-5-5 para gastar menos)
const Anthropic = require('@anthropic-ai/sdk');
const { CONOCIMIENTO } = require('../lib/chat-conocimiento');

const MODEL = process.env.CHAT_MODEL || 'claude-opus-5-5';
const WHATSAPP = (process.env.WHATSAPP_NUMERO || '').replace(/\D/g, '');
const MAX_TURNOS = 20;
const MAX_CHARS = 1000;

const SYSTEM = `Eres el asistente virtual de CosechaSelecta en su sitio web. Atiendes a clientes chilenos en español de Chile, con un tono cercano, amable y breve (2 a 5 frases, sin tablas; listas cortas solo si ayudan).

Reglas:
- Responde solo con la información de abajo. Si no la tienes (stock exacto, estado de un pedido, costo de despacho no definido, horarios, reclamos), dilo con honestidad y ${WHATSAPP ? 'ofrece seguir por WhatsApp con el botón verde del chat' : 'ofrece que dejen sus datos en el formulario de contacto de la web'}.
- Los precios del catálogo son referenciales (de ejemplo): menciónalo cuando des un precio. Nunca prometas un precio, una fecha ni un descuento que no esté aquí.
- Ayuda a elegir: sugiere si le conviene comprar al detalle o al por mayor, explica calibres y formatos, y cómo reservar en el catálogo.
- No pidas datos de pago ni claves. No tomes pedidos por chat: guía al cliente a reservar en el catálogo de la web.
- Si preguntan algo ajeno a CosechaSelecta, redirige amablemente a frutas, verduras y compras en la web.
- Escribe en texto plano, sin Markdown (nada de asteriscos ni #).

${CONOCIMIENTO}`;

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

// Límite simple por IP (best-effort, por instancia): 30 mensajes cada 10 minutos.
const hits = new Map();
function limitado(ip) {
  const now = Date.now(), win = 10 * 60e3;
  const arr = (hits.get(ip) || []).filter((t) => now - t < win);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 30;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(200).json({ activo: !!client, whatsapp: WHATSAPP || null });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!client) return res.status(503).json({ error: 'El asistente no está activo.', whatsapp: WHATSAPP || null });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  if (limitado(ip)) return res.status(429).json({ error: 'Muchos mensajes seguidos. Espera unos minutos.', whatsapp: WHATSAPP || null });

  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  const raw = Array.isArray(b.messages) ? b.messages.slice(-MAX_TURNOS) : [];
  const messages = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Mensaje vacío.' });
  }

  try {
    const r = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages,
    });
    if (r.stop_reason === 'refusal') {
      return res.status(200).json({ reply: 'Prefiero no responder eso. ¿Te ayudo con frutas, verduras o tu compra?', whatsapp: WHATSAPP || null });
    }
    const reply = r.content.filter((c) => c.type === 'text').map((c) => c.text).join('').trim()
      || 'No alcancé a responder, ¿me lo preguntas de nuevo?';
    console.log('CHAT', JSON.stringify({ in: r.usage.input_tokens, cache: r.usage.cache_read_input_tokens, out: r.usage.output_tokens }));
    return res.status(200).json({ reply, whatsapp: WHATSAPP || null });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Estamos con mucha demanda. Intenta en un momento.', whatsapp: WHATSAPP || null });
    }
    console.error('CHAT_ERROR', e && e.status, e && e.message);
    return res.status(502).json({ error: 'El asistente no está disponible ahora.', whatsapp: WHATSAPP || null });
  }
};
