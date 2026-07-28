# Aviso de privacidad — PLANTILLA EN BORRADOR

> ⚠️ Borrador sin revisión jurídica.
> Este es el texto **corto** que acompaña cada formulario. La versión completa es `politica-tratamiento-datos.md`.

## Versión para formularios

> `[NOMBRE DE LA ENTIDAD]` (NIT `[NIT]`) trata tus datos de contacto y los de tu organización para coordinar donaciones de excedentes de alimentos y dejar trazabilidad de la entrega.
>
> Puedes conocer, actualizar, rectificar y suprimir tus datos, solicitar prueba de esta autorización y revocarla, escribiendo a `[CORREO HABEAS DATA]`.
>
> Consulta la [política de tratamiento de datos personales](`[URL]`) antes de continuar.

Este texto está implementado en `app/js/core/consentimiento.js` como constante `AVISO_CORTO`. Al cambiarlo aquí, cámbialo también allí: la aplicación guarda una huella criptográfica del texto mostrado como evidencia, y ambos deben coincidir.

## Versión para pie de página

> Tratamos datos personales conforme a la Ley 1581 de 2012.
> [Política de tratamiento de datos](`[URL]`) · [Términos de uso](`[URL]`) · Contacto: `[CORREO]`

## Versión para correo electrónico

> Recibes este mensaje porque tu organización participa en el piloto de Rescate Open.
> Responsable del tratamiento: `[NOMBRE DE LA ENTIDAD]`, NIT `[NIT]`, `[CIUDAD]`.
> Para ejercer tus derechos o dejar de recibir comunicaciones: `[CORREO HABEAS DATA]`.

## Dónde debe aparecer

| Punto de recolección | Aviso requerido |
|---|---|
| Registro de organización | Versión formularios + casilla de autorización por finalidad |
| Formulario de publicación de donación | Versión formularios (contacto en sitio) |
| Formulario de reserva | Versión formularios |
| Pie de todas las páginas | Versión pie de página |
| Cualquier correo saliente | Versión correo |

La casilla de autorización **no** puede venir marcada por defecto para las finalidades opcionales, y las esenciales deben distinguirse claramente de las que se pueden rechazar.
