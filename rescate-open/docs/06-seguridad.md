# Seguridad del despliegue

Este archivo es operativo: se copia y se pega. Las decisiones de fondo están en `02-legal-y-operacion-colombia.md`.

## Cabeceras

La política es la misma en los tres proveedores. Lo importante: **`script-src` sin `unsafe-inline`**. La aplicación no tiene ni un solo `<script>` en línea ni manejadores `onclick` en el HTML, precisamente para que esta CSP se pueda aplicar sin excepciones.

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; form-action 'self';
  frame-ancestors 'none'; base-uri 'none'; object-src 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
X-Frame-Options: DENY
Permissions-Policy: geolocation=(self), camera=(self), microphone=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

> `style-src` conserva `'unsafe-inline'` porque las vistas usan atributos `style` para el gráfico de barras y algunos espaciados. Si se eliminan esos atributos, endurece a `style-src 'self'`.

> **HSTS solo cuando todos los subdominios estén en HTTPS.** `includeSubDomains` con un subdominio en HTTP deja ese subdominio inaccesible durante un año en los navegadores que ya vieron la cabecera.

Los archivos ya escritos:

- **Apache / Hostinger compartido** → `app/.htaccess`
- **Cloudflare Pages / Netlify** → `app/_headers`
- **Desarrollo local** → `herramientas/servidor.js` aplica exactamente las mismas cabeceras, para que un problema de CSP aparezca en tu máquina y no en producción

### Nginx

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Frame-Options "DENY" always;
add_header Permissions-Policy "geolocation=(self), camera=(self), microphone=(), payment=()" always;
```

## Cookies de sesión

Cuando exista autenticación con cookies (hoy la API usa tokens `Bearer`):

```
Set-Cookie: sesion=<opaco>; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200
```

- `HttpOnly` — el JavaScript no debe poder leerla nunca.
- `SameSite=Lax` — suficiente para el flujo actual; `Strict` si no rompe los enlaces de correo.
- Sin `Domain=` — que no se comparta con otros subdominios.
- El valor es opaco y en base de datos se guarda **solo su hash** (`api/schema.sql`, tabla `tokens`).

## Qué no debe subirse al hosting estático

```
tests/          herramientas/       api/
package.json    package-lock.json   .env  .env.*
*.md fuera de legal/ y docs/ si no quieres exponer notas internas
```

Comprobación rápida tras desplegar:

```bash
for r in package.json tests/estados.test.js api/worker.js .env; do
  printf "%-28s %s\n" "$r" "$(curl -s -o /dev/null -w '%{http_code}' https://app.tudominio.co/$r)"
done   # todo debe responder 404
```

## Rotación de secretos

| Secreto | Dónde | Al rotar |
|---|---|---|
| `SAL_AUDITORIA` | Worker | Los seudónimos de IP anteriores dejan de correlacionarse con los nuevos. A veces es justo lo que se quiere; documéntalo en el registro de cambios |
| `SAL_TOKENS` | Worker | **Invalida todas las sesiones.** Rotar solo con aviso o ante sospecha de compromiso |
| Credenciales de D1 / hosting | Proveedor | Rotación inmediata ante salida de personal con acceso |

Ninguno va a Git. `.env.example` documenta los nombres, nunca los valores.

## Lista de verificación previa a producción

**Infraestructura**
- [ ] HTTPS forzado y HTTP redirigiendo con 301
- [ ] Cabeceras verificadas con `curl -sI`
- [ ] HSTS activado **después** de confirmar HTTPS en todos los subdominios
- [ ] WAF y rate limiting en login, registro, carga de archivos y API pública
- [ ] Backups cifrados con retención definida y **restauración probada al menos una vez**

**Cuentas**
- [ ] MFA en registrador, hosting, Cloudflare, GitHub y correo
- [ ] Cuentas individuales; nadie comparte el acceso maestro
- [ ] Roles `VERIFIER` y `ADMIN` con segundo factor real (hoy el esquema lo exige con un `CHECK`, pero el flujo debe poblarlo)

**Aplicación**
- [ ] `npm test` en verde
- [ ] Cero asignaciones a `.estado` fuera de `core/estados.js` (ver `05-maquina-de-estados.md`)
- [ ] Ningún dato real en semillas, pruebas ni capturas
- [ ] Documentos de verificación en almacenamiento cifrado y separado, con URLs temporales
- [ ] Auditoría con disparadores anti-`UPDATE`/`DELETE` aplicados (`api/schema.sql`)

**Datos personales**
- [ ] Política de tratamiento publicada y enlazada desde cada formulario
- [ ] Canal de PQR operativo y con responsable asignado
- [ ] Calendario de retención escrito y aplicable
- [ ] DPA firmado con cada proveedor que trate datos por cuenta de la entidad

## Modelo de amenazas resumido

| Amenaza | Mitigación actual | Pendiente |
|---|---|---|
| Organización falsa que se hace pasar por receptora | Verificación documental manual, sin aprobación automática; nadie verifica su propia organización | Contraste con fuentes oficiales |
| Desvío de alimento a comercialización | Solo organizaciones verificadas; acta de recepción; derecho de auditoría y suspensión | Muestreo de destino en campo |
| Publicación de alimento no apto | 21 reglas de bloqueo + revalidación en la entrega + auditoría de intentos bloqueados | Validación por profesional de inocuidad |
| Cosecha de direcciones y teléfonos de donantes | La vista pública no incluye contacto ni dirección; se revelan solo por reserva y con auditoría | Límite de reservas simultáneas por organización |
| Manipulación del historial | Cadena de hash + disparadores `RAISE(ABORT)` en la base de datos | Exportación periódica a almacenamiento externo |
| Suplantación en el retiro | Código de entrega generado por el servidor y conocido solo por quien recibe | Segunda evidencia (firma o foto del documento) |
| Escalada de privilegios desde el cliente | La autoridad está en el Worker; el navegador solo propone | Autenticación completa con correo verificado |

## Reporte de vulnerabilidades

`SECURITY.md`. Nunca por canal público, nunca en un issue.
