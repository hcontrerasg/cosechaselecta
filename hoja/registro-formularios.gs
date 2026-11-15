/**
 * CosechaSelecta · Registro de formularios del sitio en Google Sheets.
 * Cada formulario va a su propia pestaña; las columnas se crean solas
 * la primera vez que llega un campo nuevo.
 *
 * Instalación:
 * 1. Crea una hoja de cálculo nueva en Google Sheets ("Formularios CosechaSelecta").
 * 2. Menú Extensiones → Apps Script. Borra lo que aparece y pega este archivo completo. Guarda.
 * 3. Implementar → Nueva implementación → tipo "Aplicación web".
 *    Ejecutar como: Yo. Quién tiene acceso: Cualquier usuario. → Implementar → Autorizar.
 * 4. Copia la URL de la aplicación web (termina en /exec) y envíasela a Claude.
 */
var TOKEN = '__CAMBIAR__'; // reemplazar por la clave real; la copia lista para pegar no se sube al repo // clave compartida con el sitio (SHEETS_TOKEN en Vercel)

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    if (TOKEN && data.token !== TOKEN) return json_({ ok: false, error: 'token' });
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var nombre = String(data.hoja || 'Formularios').slice(0, 90);
    var sh = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
    var fila = data.fila || {};
    var claves = Object.keys(fila);
    var cab = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    claves.forEach(function (k) { if (cab.indexOf(k) < 0) cab.push(k); });
    sh.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold').setBackground('#E6EFE9');
    sh.setFrozenRows(1);
    var valores = cab.map(function (k) { var v = fila[k]; v = v == null ? '' : String(v); return /^[=+\-@]/.test(v) ? "'" + v : v; });
    sh.appendRow(valores);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return json_({ ok: true, info: 'Registro de formularios CosechaSelecta' }); }

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
