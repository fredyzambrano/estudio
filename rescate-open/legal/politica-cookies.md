# Política de cookies y almacenamiento local — PLANTILLA EN BORRADOR

> ⚠️ Borrador sin revisión jurídica.
> Versión: `1.0.0-borrador`

## Estado actual (piloto)

La aplicación de demostración **no usa cookies, ni analítica, ni etiquetas de terceros, ni redes publicitarias**. No hay ninguna solicitud a dominios externos: la política de seguridad de contenido de la aplicación las bloquea explícitamente.

Sí usa **almacenamiento local del navegador** (`localStorage`), que es técnicamente distinto de una cookie pero también guarda información en tu dispositivo.

| Clave | Contenido | Finalidad | Duración | Se envía a un servidor |
|---|---|---|---|---|
| `rescate_open_v1` | Estado completo del piloto: organizaciones, donaciones, auditoría y rol seleccionado, todo ficticio | Que la demostración funcione sin backend | Hasta que la borres | **No** |

Puedes borrarla desde **Cuenta → Suprimir todo**, o limpiando los datos del sitio en tu navegador. No queda ninguna copia en otro lugar.

## Cuando exista autenticación real

`TODO (legal)`: actualizar esta sección al desplegar el backend. Previsiblemente:

| Nombre | Tipo | Finalidad | Duración | Base |
|---|---|---|---|---|
| `sesion` | Cookie técnica | Mantener la sesión autenticada | `[N]` horas | Necesaria para el servicio |

Las cookies estrictamente necesarias para prestar el servicio solicitado no requieren consentimiento; cualquier otra sí. Si en algún momento se añade analítica, debe:

1. aparecer en esta tabla con proveedor, finalidad y duración;
2. tener contrato de encargo firmado (`dpa-encargado.md`);
3. no activarse antes del consentimiento;
4. poder rechazarse con la misma facilidad con la que se acepta.

## Compromiso del proyecto

Mientras sea posible, Rescate Open **no incorporará etiquetas de terceros**. La aplicación tiene cero dependencias externas en ejecución, y esa decisión —tomada por seguridad— tiene el efecto lateral de que no hay nada que consentir.

Si el proyecto necesita métricas de uso, la primera opción debe ser analítica sin identificación individual y alojada por la propia entidad.

## Inventario de terceros

| Proveedor | Qué hace | Datos que recibe | DPA |
|---|---|---|---|
| `[HOSTING]` | Sirve los archivos | Dirección IP y datos de conexión (registros del servidor) | `[SÍ/NO]` |

Este inventario debe mantenerse actualizado: es lo primero que se pide en cualquier revisión.

## Contacto

Dudas sobre esta política: `[CORREO]`
