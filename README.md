# CosechaSelecta

Sitio web de CosechaSelecta: fruta y verdura a precio mayorista para todos, directo del agricultor.

- `index.html`: página principal (HTML estático, sin build).
- `logo.png`, `logo-claro.png`: logo para fondo claro y oscuro.

Se publica en Vercel como sitio estático (sin framework ni comando de build).

Estado: prototipo. Productores, precios y formatos son ejemplos; fotos de Pexels.

## Formularios

Todos los formularios (pedido semanal, pedido del carrito, agricultores y exportación) se envían a
`api/contacto.js`, que manda un correo a **hector.contreras@cosechaselecta.com** usando Resend.

Variables de entorno en Vercel: `RESEND_API_KEY` (obligatoria), `MAIL_TO` y `MAIL_FROM` (opcionales).
Cada envío se agrega además como fila en una hoja de Google Sheets (una pestaña por formulario) mediante
el Apps Script `hoja/registro-formularios.gs`: variables `SHEETS_WEBHOOK_URL` y `SHEETS_TOKEN`.
También queda en los logs de Vercel como `FORMULARIO {...}`.

## Checkout y pagos en línea (Flow)

- El botón "Confirmar pedido" del carrito guarda el carrito en el navegador y abre `checkout.html`
  (contacto, entrega, boleta o factura, y pago con Flow o contra entrega).
- `api/pedido/cotizar.js` y `api/pedido/crear.js` recalculan el total en el servidor con `lib/precios.js`,
  que lee el catálogo `const P=[...]` directamente de `index.html` (los precios se siguen editando allí).
  Las fórmulas de precio (`bruto`, `bmay`, `udet`) están copiadas en `lib/precios.js`: si cambian, cambiarlas en ambos.
- Despacho: `SHIP` ($3.990) bajo `FREE_RM` ($24.990), gratis desde ahí; se suma al total en carrito, checkout y cobro.
- Pago en línea con cualquier monto si todos los productos tienen precio. Si alguno tiene "precio del día",
  el pedido queda "contra entrega" y se puede cobrar después con `/pagar.html?pedido=X&monto=Y`.
- Cada pedido llega por correo y a la hoja como "Pedido desde el carrito"; cada pago confirmado por Flow,
  como "Pago en línea (Flow)". También en los logs de Vercel (`PEDIDO {...}`, `PAGO {...}`).
- `pago-resultado.html` muestra pagado, pendiente, rechazado, anulado o reservado.

Variables de entorno en Vercel: `FLOW_API_KEY`, `FLOW_SECRET_KEY`, `FLOW_ENV` (`sandbox` o `production`), `SITE_URL`.
