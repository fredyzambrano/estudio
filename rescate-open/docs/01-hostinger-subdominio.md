# Subdominio seguro en Hostinger

Ejemplo: `app.tudominio.co` para la aplicación y [`www.tudominio.co`](https://www.tudominio.co) para la web pública.

## Antes de tocar DNS

- Compra o usa un dominio a nombre de la entidad operadora, con un correo corporativo bajo su control.
- Activa MFA en Hostinger, registrador, correo, GitHub y proveedor de base de datos.
- Crea cuentas individuales: no compartas el acceso maestro.
- Decide el destino según lo que vayas a desplegar (ver la sección siguiente).

## Dos rutas de despliegue, según lo que publiques

Este repositorio permite dos escenarios distintos y conviene no confundirlos.

| | **A. Piloto estático (`app/`)** | **B. Producción con backend (`api/`)** |
|---|---|---|
| Qué se despliega | HTML, CSS y JS; datos en el navegador | Aplicación con autorización en servidor y base de datos |
| Hosting | Hosting estático de Hostinger sirve perfectamente | **No** uses hosting compartido: requiere Node/Workers y base de datos |
| Datos personales reales | **No** — solo demostración | Sí, con todo lo que eso implica |
| Sirve para | Mostrar el flujo, validar con aliados, levantar el piloto | Operar |

Empieza por A para enseñar el producto; no recibas datos reales hasta tener B con revisión legal.

## Crear el subdominio

1. En hPanel: **Websites → Dashboard** del dominio → **Domains → Subdomains**.
2. Crea `app` (resultado: `app.tudominio.co`). Si Hostinger no hospeda la aplicación, créalo como registro DNS, no como carpeta web.
3. En **Domains → DNS Zone Editor**, agrega solo el registro indicado por el proveedor de despliegue:
   - `CNAME`, nombre `app`, destino el hostname que entregue el proveedor; o
   - `A`, nombre `app`, destino la IPv4 fija de tu VPS.
4. Elimina registros duplicados o en conflicto para `app`; no cambies MX, SPF ni DKIM del correo.
5. En el proveedor de despliegue agrega `app.tudominio.co` como dominio personalizado y espera la validación.
6. Habilita SSL/TLS y fuerza HTTPS. Redirige HTTP a HTTPS.
7. Configura `NEXT_PUBLIC_APP_URL=https://app.tudominio.co` (o `APP_URL` en el Worker) y reinicia el despliegue.

Hostinger documenta el flujo actual para subdominios en hPanel: [guía oficial](https://support.hostinger.com/en/articles/1583405-how-to-create-and-delete-subdomains-in-hostinger).

### Escenario A, paso a paso

1. Crea el subdominio `app`; Hostinger genera una carpeta (normalmente `public_html/app`).
2. Sube **el contenido de `rescate-open/app/`** a esa carpeta, más las carpetas `legal/`, `docs/` y el archivo `LICENSE` un nivel arriba (la aplicación los enlaza con `../`).
3. Sube también el archivo `app/.htaccess` de este repositorio: trae las cabeceras de seguridad ya configuradas.
4. Activa SSL y fuerza HTTPS desde hPanel.
5. Verifica en el navegador: la consola no debe mostrar errores de CSP.

**No subas** al hosting: `tests/`, `herramientas/`, `api/`, `package.json`.

## Parámetros obligatorios de seguridad

- HSTS: `max-age=31536000; includeSubDomains` **solo** cuando todos los subdominios estén correctamente en HTTPS.
- Cookies de sesión: `Secure`, `HttpOnly`, `SameSite=Lax` (o `Strict` si no rompe el flujo).
- Cabeceras: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` y una CSP probada.
- Backups cifrados de base de datos, retención definida y prueba mensual de restauración.
- Secretos exclusivamente en variables del proveedor; nunca en Git, frontend o capturas.
- Registros de auditoría inmutables para publicación, reserva, entrega, verificación y cambios de permisos.
- WAF/rate limiting en login, registro, carga de archivos y APIs públicas.

Las cabeceras concretas, ya escritas para tres proveedores, están en `docs/06-seguridad.md`, `app/.htaccess` y `app/_headers`.

## Separación recomendada

| Subdominio | Uso | Datos sensibles |
|---|---|---|
| `www` | Sitio informativo y documentos legales | No |
| `app` | Aplicación autenticada | Sí |
| `status` | Estado público, sin detalles internos | No |
| `api` | Solo si la API debe ser pública; si no, mantenerla detrás de `app` | Sí |

No crees subdominios administrativos públicos como `admin.`. El panel interno debe requerir autenticación fuerte, rol explícito y, en producción, una capa adicional de acceso.

## Comprobación posterior al despliegue

```bash
# La cabecera debe existir y no traer 'unsafe-inline' en script-src
curl -sI https://app.tudominio.co | grep -i content-security-policy

# HTTP debe redirigir a HTTPS con 301
curl -sI http://app.tudominio.co | head -1

# Ningún archivo interno debe ser accesible
curl -s -o /dev/null -w "%{http_code}\n" https://app.tudominio.co/../package.json
```
