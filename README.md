# CosechaSelecta

Sitio web de CosechaSelecta: fruta y verdura mayorista en preventa, directo del agricultor.

- `index.html`: página principal (HTML estático, sin build).
- `logo.png`, `logo-claro.png`: logo para fondo claro y oscuro.

Se publica en Vercel como sitio estático (sin framework ni comando de build).

Estado: prototipo. Productores, precios y formatos son ejemplos; fotos de Pexels.

## Formularios

Todos los formularios (pedido semanal, reserva del carrito, agricultores y exportación) se envían a
`api/contacto.js`, que manda un correo a **hector.contreras@cosechaselecta.com** usando Resend.

Variables de entorno en Vercel: `RESEND_API_KEY` (obligatoria), `MAIL_TO` y `MAIL_FROM` (opcionales).
Cada envío se agrega además como fila en una hoja de Google Sheets (una pestaña por formulario) mediante
el Apps Script `hoja/registro-formularios.gs`: variables `SHEETS_WEBHOOK_URL` y `SHEETS_TOKEN`.
También queda en los logs de Vercel como `FORMULARIO {...}`.
