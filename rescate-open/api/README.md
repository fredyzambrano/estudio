# API de Rescate Open

Cloudflare Worker + D1. Ejecuta **el mismo núcleo** que la aplicación (`../app/js/core/`), pero aquí es la autoridad: el navegador propone, este Worker dispone.

## Por qué existe

El piloto de `app/` guarda todo en `localStorage`. Eso es suficiente para demostrar el flujo y decidir con aliados, pero cualquiera puede abrir las herramientas de desarrollo y escribir el estado que quiera. En el momento en que entren organizaciones reales y datos personales, la autorización tiene que vivir en un servidor.

Wrangler empaqueta los imports, así que `worker.js` importa directamente los archivos de `../app/js/core/`. Una regla de inocuidad se escribe una vez y corre en los dos lados.

## Puesta en marcha

```bash
cd rescate-open/api

npx wrangler d1 create rescate-open                       # anota el database_id
# pega el id en wrangler.toml

npx wrangler d1 execute rescate-open --file=./schema.sql --local
npx wrangler secret put SAL_AUDITORIA                     # openssl rand -base64 32
npx wrangler secret put SAL_TOKENS                        # openssl rand -base64 32

npx wrangler dev                                          # local
npx wrangler deploy                                       # producción
```

Para producción, aplica el esquema con `--remote` y publica el Worker detrás de `app.tudominio.co/api/*` (ruta) en lugar de un subdominio `api.` separado, salvo que necesites la API pública.

## Endpoints

| Método | Ruta | Autenticación | Qué hace |
|---|---|---|---|
| `GET` | `/api/salud` | no | Latido del servicio |
| `GET` | `/api/donaciones` | no | Publicadas con ventana vigente, **proyección pública** |
| `GET` | `/api/yo` | sí | Rol y organización del token |
| `POST` | `/api/donaciones` | sí (DONOR) | Crea en `DRAFT`; nunca publica directamente |
| `GET` | `/api/donaciones/:id` | sí | Detalle; revela dirección solo a quien reservó |
| `POST` | `/api/donaciones/:id/transicion` | sí | **Única** vía de cambio de estado |
| `POST` | `/api/organizaciones/:id/verificacion` | sí (VERIFIER/ADMIN) | Verificar, rechazar o suspender |
| `GET` | `/api/auditoria` | sí (staff) | Últimos 200 eventos encadenados |

### Ejemplo: reservar una donación

```bash
curl -X POST https://app.tudominio.co/api/donaciones/don_abc123/transicion \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"a":"RESERVED"}'
```

El código de entrega **lo genera el servidor**, nunca el cliente: es la prueba de que el retiro ocurrió, y quien la pide no puede elegirla.

### Ejemplo: registrar la entrega física

```bash
curl -X POST https://app.tudominio.co/api/donaciones/don_abc123/transicion \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "a": "HANDED_OVER",
        "codigoEntrega": "K7M-P4X",
        "evidencia": { "fotos": ["r2://evidencias/..."], "recibeNombre": "Auxiliar de logística" }
      }'
```

Si el lote venció entre la reserva y el retiro, esta llamada devuelve `409 INOCUIDAD_ENTREGA` y el intento queda auditado. Es deliberado: la revalidación en la entrega es el único momento en que se puede detener un alimento que dejó de ser apto.

## Códigos de error

| Código | HTTP | Significado |
|---|---|---|
| `SIN_SESION` | 401 | Token ausente, inválido, revocado o expirado |
| `CORREO_NO_VERIFICADO` | 401 | La cuenta existe pero no confirmó el correo |
| `ROL_INSUFICIENTE` / `NO_ES_PROPIETARIO` / `NO_ES_PARTE` | 403 | Autorización por recurso |
| `MFA_REQUERIDO` | 403 | Rol crítico sin segundo factor |
| `INOCUIDAD` / `INOCUIDAD_ENTREGA` | 409 | Bloqueo sanitario, con `detalle[]` de causas |
| `TRANSICION_NO_PERMITIDA` / `ESTADO_TERMINAL` / `YA_RESERVADA` | 409 | Máquina de estados |
| `VALIDACION` | 422 | Datos inválidos, con `errores[]` por campo |
| `DEMASIADAS_SOLICITUDES` | 429 | Límite por IP seudonimizada y ruta |

## Lo que este Worker todavía NO hace

Se dice explícitamente para que nadie asuma lo contrario:

- **No hay registro ni inicio de sesión.** Los tokens deben crearse fuera de banda mientras no exista el flujo de correo verificado. Emitirlos sin verificación de correo sería exactamente el agujero que el piloto quiere evitar.
- **No hay segundo factor real.** Se exige la bandera `mfa_activo`, que hoy debe poblarse manualmente.
- **No sube archivos.** Las fotos y los documentos de verificación necesitan almacenamiento cifrado (R2 con URLs firmadas de corta vida) y una política de retención escrita.
- **No envía notificaciones.**

## Decisiones de seguridad que conviene no revertir

1. `GET /api/donaciones` responde con `vistaPublica()`, que borra dirección, contacto y código. Si alguien "optimiza" devolviendo la fila cruda, expone datos de contacto de todos los donantes.
2. Cuando un recurso no es visible se responde `404`, no `403`: así no se filtra qué existe.
3. La tabla `auditoria` tiene disparadores que abortan `UPDATE` y `DELETE`. La inmutabilidad está en la base de datos, no solo en el código.
4. La IP nunca se guarda completa: se recorta a /24 (o /48) y se seudonimiza con `SAL_AUDITORIA`.
5. El CORS usa lista blanca y no refleja el `Origin` recibido.
