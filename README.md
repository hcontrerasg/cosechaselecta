# CosechaSelecta

Sitio web de CosechaSelecta: fruta y verdura mayorista en preventa, directo del agricultor.

- `index.html`: página principal (HTML estático, sin build).
- `logo.png`, `logo-claro.png`: logo para fondo claro y oscuro.

Se publica en Vercel como sitio estático (sin framework ni comando de build).

Estado: prototipo. Productores, precios y formatos son ejemplos; fotos de Pexels.

## Carrito y checkout

- `catalogo.js`: lista de precios por bulto (neto), pedido mínimo e IVA. **Precios de ejemplo**: cámbialos aquí.
  La usan la web y el servidor; el total siempre se recalcula en el servidor.
- El carrito ("Mi pedido") muestra precios, IVA, total y cuánto falta para el pedido mínimo, y se guarda en el navegador.
- `checkout.html`: contacto, entrega, boleta o factura (con nombre, RUT, teléfono, giro y dirección de facturación) y forma de pago (Flow o contra entrega).
- `api/pedido/crear.js`: valida el pedido y, si es factura, sus datos y el RUT; genera el número `CS-AAMMDD-XXXX` y abre el pago en Flow.
  Cada pedido queda en los logs de Vercel con la línea `PEDIDO {...}`.

## Pagos (Flow)

- `pagar.html`: el cliente ingresa N° de pedido y monto y paga con Webpay o transferencia vía Flow.
  Se puede enviar un enlace con datos precargados: `/pagar.html?pedido=1024&monto=150000`.
- `pago-resultado.html`: página a la que vuelve el cliente (pagado, pendiente, rechazado o anulado).
- `api/pago/crear.js`, `api/pago/confirmacion.js`, `api/pago/retorno.js`: funciones de Vercel; `lib/flow.js` firma las llamadas.
- Cada pago confirmado queda registrado en los logs de Vercel con la línea `PAGO {...}`.

Variables de entorno en Vercel (Settings → Environment Variables):

| Variable | Valor |
|---|---|
| `FLOW_API_KEY` | API Key de Flow (Integraciones) |
| `FLOW_SECRET_KEY` | Secret Key de Flow |
| `FLOW_ENV` | `sandbox` para pruebas, `production` para cobrar de verdad |
| `SITE_URL` | opcional, ej. `https://www.cosechaselecta.com` |
