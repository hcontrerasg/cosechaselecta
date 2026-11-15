// Valida RUT chileno (módulo 11). Acepta "76.123.456-7" o "761234567".
function limpiar(r) { return String(r || '').replace(/[^0-9kK]/g, '').toUpperCase(); }
function valido(r) {
  const s = limpiar(r);
  if (s.length < 8 || s.length > 9) return false;
  const cuerpo = s.slice(0, -1), dv = s.slice(-1);
  let suma = 0, m = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) { suma += +cuerpo[i] * m; m = m === 7 ? 2 : m + 1; }
  const r11 = 11 - (suma % 11);
  return dv === (r11 === 11 ? '0' : r11 === 10 ? 'K' : String(r11));
}
function formato(r) { const s = limpiar(r); return s.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + s.slice(-1); }
module.exports = { valido, formato };
