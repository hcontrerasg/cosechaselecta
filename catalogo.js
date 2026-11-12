// Lista de precios mayorista por bulto (CLP, neto sin IVA). PRECIOS DE EJEMPLO: reemplazar por los reales.
// La usan la web (window.CATALOGO) y el servidor (require), así el total se recalcula en el servidor.
// Para un precio distinto por calibre: cal: { 'Calibre 18–20': 36900 }.
(function (root) {
  var CATALOGO = {
    pedidoMinimo: 80000, // neto
    iva: 0.19,
    productos: {
      'Palta Hass': { bulto: 'Caja 10 kg', precio: 34900 },
      'Limón': { bulto: 'Malla 18 kg', precio: 21900 },
      'Frutillas': { bulto: 'Caja 4 kg', precio: 15900 },
      'Cerezas': { bulto: 'Caja 5 kg', precio: 24900 },
      'Arándanos': { bulto: 'Caja 2 kg', precio: 13900 },
      'Uva de mesa': { bulto: 'Caja 8,2 kg', precio: 14900 },
      'Durazno': { bulto: 'Caja 10 kg', precio: 13900 },
      'Manzana': { bulto: 'Caja 18 kg', precio: 19900 },
      'Naranja': { bulto: 'Malla 18 kg', precio: 16900 },
      'Tomate limachino': { bulto: 'Caja 18 kg', precio: 25900 },
      'Lechuga costina': { bulto: 'Caja 12 unidades', precio: 8900 },
      'Espárragos': { bulto: 'Caja 5 kg', precio: 24900 },
      'Papa': { bulto: 'Saco 25 kg', precio: 17900 },
      'Cebolla': { bulto: 'Malla 20 kg', precio: 12900 },
      'Zanahoria': { bulto: 'Saco 20 kg', precio: 10900 },
      'Pimentón': { bulto: 'Caja 10 kg', precio: 15900 },
      'Acelga': { bulto: 'Caja 12 atados', precio: 7900 },
      'Ajo': { bulto: 'Malla 10 kg', precio: 29900 },
      'Apio': { bulto: 'Caja 12 unidades', precio: 11900 },
      'Brócoli': { bulto: 'Caja 12 unidades', precio: 10900 },
      'Choclo': { bulto: 'Saco 50 unidades', precio: 17900 },
      'Coliflor': { bulto: 'Caja 8 unidades', precio: 9900 },
      'Pepino': { bulto: 'Caja 10 kg', precio: 8900 },
      'Repollo': { bulto: 'Saco 10 unidades', precio: 9900 },
      'Zapallo': { bulto: 'Malla 25 kg', precio: 16900 },
      'Huevos de campo': { bulto: 'Bandeja 180 unidades', precio: 39900 }
    },
    precio: function (nombre, calibre) {
      var p = CATALOGO.productos[nombre];
      if (!p) return null;
      return (p.cal && p.cal[calibre]) || p.precio;
    },
    // items: [{ n, cal, q }] -> { lineas, neto, iva, total }
    totales: function (items) {
      var lineas = [], neto = 0;
      for (var i = 0; i < items.length; i++) {
        var it = items[i], pu = CATALOGO.precio(it.n, it.cal), q = Math.floor(Number(it.q));
        if (pu == null || !(q >= 1 && q <= 999)) continue;
        lineas.push({ n: it.n, cal: String(it.cal || ''), q: q, bulto: CATALOGO.productos[it.n].bulto, precio: pu, subtotal: pu * q });
        neto += pu * q;
      }
      var iva = Math.round(neto * CATALOGO.iva);
      return { lineas: lineas, neto: neto, iva: iva, total: neto + iva };
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = CATALOGO;
  else root.CATALOGO = CATALOGO;
})(this);
