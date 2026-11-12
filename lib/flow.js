// Cliente mínimo de la API de Flow (https://www.flow.cl/docs/api.html).
// Claves en variables de entorno de Vercel: FLOW_API_KEY, FLOW_SECRET_KEY.
// FLOW_ENV=production usa www.flow.cl; cualquier otro valor usa el sandbox.
const crypto = require('crypto');

function baseUrl() {
  return process.env.FLOW_ENV === 'production'
    ? 'https://www.flow.cl/api'
    : 'https://sandbox.flow.cl/api';
}

function keys() {
  const apiKey = process.env.FLOW_API_KEY;
  const secret = process.env.FLOW_SECRET_KEY;
  if (!apiKey || !secret) throw new Error('Faltan FLOW_API_KEY o FLOW_SECRET_KEY');
  return { apiKey, secret };
}

// Firma: parámetros ordenados por nombre, concatenados nombre+valor, HMAC-SHA256 con la secretKey.
function sign(params, secret) {
  const str = Object.keys(params).sort().map(k => k + params[k]).join('');
  return crypto.createHmac('sha256', secret).update(str).digest('hex');
}

async function call(method, path, params) {
  const { apiKey, secret } = keys();
  const p = { ...params, apiKey };
  const body = new URLSearchParams({ ...p, s: sign(p, secret) });
  const url = baseUrl() + path;
  const res = method === 'GET'
    ? await fetch(url + '?' + body.toString())
    : await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Flow ${path} ${res.status}: ${data.message || JSON.stringify(data)}`);
  return data;
}

const createPayment = params => call('POST', '/payment/create', params);
const getStatus = token => call('GET', '/payment/getStatus', { token });

// Estados de Flow: 1 pendiente, 2 pagada, 3 rechazada, 4 anulada.
const STATUS = { 1: 'pendiente', 2: 'pagado', 3: 'rechazado', 4: 'anulado' };

function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers['x-forwarded-host'] || req.headers.host}`;
}

module.exports = { createPayment, getStatus, STATUS, siteUrl, sign };
