// Precios del carrito calculados en el servidor, leyendo el catálogo de index.html.
// Así los precios se siguen editando en un solo lugar (const P=[...] en index.html)
// y nadie puede cambiar un precio desde su navegador.
// Las fórmulas copian las de index.html (bruto, bmay, upm, udet, uinf, fmtInfo).
// Si se cambian allá, hay que cambiarlas aquí.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let cache = null;

function leerIndex() {
  const candidatos = [path.join(process.cwd(), 'index.html'), path.join(__dirname, '..', 'index.html')];
  for (const f of candidatos) { try { return fs.readFileSync(f, 'utf8'); } catch {} }
  throw new Error('No se encontró index.html');
}

// Extrae el arreglo literal que empieza en "const P=[" respetando corchetes y comillas.
function extraerArreglo(src, marca) {
  const i = src.indexOf(marca);
  if (i < 0) throw new Error('No se encontró ' + marca);
  let j = i + marca.length - 1, depth = 0, q = null;
  for (; j < src.length; j++) {
    const c = src[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') q = c;
    else if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) break; }
  }
  return src.slice(i + marca.length - 1, j + 1);
}

function constante(src, nombre, porDefecto) {
  const m = src.match(new RegExp('\\b' + nombre + '\\s*=\\s*([0-9.]+)'));
  return m ? Number(m[1]) : porDefecto;
}

function catalogo() {
  if (cache) return cache;
  const src = leerIndex();
  const P = vm.runInNewContext('(' + extraerArreglo(src, 'const P=[') + ')', {}, { timeout: 200 });
  cache = { P, FREE_RM: constante(src, 'FREE_RM', 24990), DET_F: constante(src, 'DET_F', 1), MAY_D: constante(src, 'MAY_D', 0.8) };
  return cache;
}

const fmtInfo = x => { const k = x.f.match(/(\d+(?:,\d+)?)\s*kg/); const u = x.f.match(/(\d+)\s*(unidades|atados)/); return k ? { kg: parseFloat(k[1].replace(',', '.')) } : { kg: 0, n: u ? +u[1] : 0, uu: u ? u[2] : '' }; };
const uinf = x => { const fi = fmtInfo(x); return fi.kg ? { u: 'kg', q: fi.kg, st: 0.5 } : fi.n ? { u: fi.uu === 'atados' ? 'atado' : 'unidad', q: fi.n, st: 1 } : { u: 'kg', q: 0, st: 0.5 }; };
const bruto = x => Math.round(x.pm * 1.19 / 10) * 10;
const r90 = v => Math.ceil((v - 90) / 100) * 100 + 90;

function precios(C) {
  const bmay = x => x.nd ? bruto(x) : Math.round(bruto(x) * C.MAY_D / 10) * 10;
  const upm = x => { const u = uinf(x); return u.q ? Math.round(bruto(x) / u.q) : 0; };
  const udet = x => { const v = upm(x); return C.DET_F === 1 ? v : r90(v * C.DET_F); };
  return { bmay, udet };
}

// items: [{ t:'d'|'m', n, f, cal, q }]  (t: d = al detalle por kg/unidad, m = al por mayor por bulto)
// -> { lineas, total, todoConPrecio, despachoGratis, faltaDespacho, FREE_RM }
function cotizar(items) {
  const C = catalogo(), { bmay, udet } = precios(C);
  const lineas = [];
  let total = 0, todoConPrecio = true;
  for (const it of (Array.isArray(items) ? items.slice(0, 80) : [])) {
    const t = it && it.t === 'm' ? 'm' : 'd';
    const mismos = C.P.filter(p => p.n === it.n);
    const x = mismos.find(p => p.f === it.f) || (mismos.length === 1 ? mismos[0] : null);
    if (!x) continue;
    if (t === 'd' && x.nd) continue; // los productos "nd" (huevos) se venden siempre por bandeja o caja
    const cal = x.c.includes(it.cal) ? it.cal : x.c[0];
    const u = uinf(x);
    let q = Number(it.q);
    if (!(q > 0 && q <= 2000)) continue;
    q = t === 'd' ? Math.round(q / u.st) * u.st : Math.round(q);
    if (!(q > 0)) continue;
    const linea = { t, n: x.n, f: x.f, cal, q, unidad: t === 'd' ? u.u : x.f.split(' ')[0].toLowerCase() };
    if (x.pm) {
      linea.precio = t === 'd' ? udet(x) : bmay(x);
      linea.subtotal = Math.round(linea.precio * q);
      total += linea.subtotal;
    } else { linea.precio = null; linea.subtotal = null; todoConPrecio = false; }
    lineas.push(linea);
  }
  const despachoGratis = total >= C.FREE_RM;
  return { lineas, total, todoConPrecio, despachoGratis, faltaDespacho: Math.max(0, C.FREE_RM - total), FREE_RM: C.FREE_RM };
}

// Se puede pagar en línea solo si todo tiene precio y el despacho es gratis (no hay montos por confirmar).
const pagableEnLinea = c => c.lineas.length > 0 && c.todoConPrecio && c.despachoGratis;

module.exports = { cotizar, pagableEnLinea, _catalogo: catalogo };
