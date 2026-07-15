# 🔧 Setup del webhook de MercadoPago

Tiempo estimado: **30–45 minutos** (una sola vez).  
Costo: **$0/mes** (Cloudflare free tier + Resend free tier cubre 3.000 emails/mes).

---

## Servicios que necesitas crear (todos gratuitos)

| Servicio | Para qué | Costo |
|---|---|---|
| [Cloudflare](https://cloudflare.com) | Correr el worker (tu backend) | Gratis |
| [Resend](https://resend.com) | Enviar emails con el código | Gratis |
| MercadoPago | Recibir pagos (ya lo tienes) | Ya lo tienes |

---

## Paso 1 — Preparar Resend (email)

1. Crea cuenta en **resend.com**
2. Ve a **Domains → Add Domain** y agrega `aprendeamonetizar.com`
3. Sigue las instrucciones para agregar los DNS records en tu hosting
4. Una vez verificado, ve a **API Keys → Create API Key** y guarda la key

---

## Paso 2 — Preparar Cloudflare

### 2a. Crear cuenta y KV namespace

1. Crea cuenta en **cloudflare.com** (gratis)
2. En el dashboard ve a **Workers & Pages → KV → Create namespace**
3. Nombre: `DESPEGA_CODES`
4. Copia el **Namespace ID** que aparece (lo necesitas en el paso 4)

### 2b. Instalar Wrangler (CLI de Cloudflare)

```bash
npm install -g wrangler
wrangler login   # abre el browser para autenticarte
```

---

## Paso 3 — Configurar wrangler.toml

Abre `webhook/wrangler.toml` y pega el ID del KV que copiaste:

```toml
[[kv_namespaces]]
binding = "CODES_KV"
id      = "PEGA_AQUI_TU_KV_NAMESPACE_ID"   # ← aquí
```

Si tu dominio de email es diferente a `aprendeamonetizar.com`, también cámbialo:

```toml
[vars]
EMAIL_DOMAIN = "tudominio.com"
```

---

## Paso 4 — Cargar los códigos en KV

Consigue estos datos desde el **dashboard de Cloudflare**:
- **Account ID**: aparece en la barra lateral derecha de cloudflare.com
- **API Token**: Profile → API Tokens → Create Token → "Edit Cloudflare Workers"
- **KV ID**: el Namespace ID del paso 2a

Luego corre:

```bash
cd webhook

CF_ACCOUNT_ID=tu_account_id \
CF_API_TOKEN=tu_api_token \
KV_ID=tu_kv_namespace_id \
node seed-codes.js
```

Verás algo como:
```
✅ pool:pro   → 10 códigos
✅ pool:elite → 5 códigos
🎉 Listo.
```

---

## Paso 5 — Configurar los secrets del worker

Estos son los valores sensibles que NO van en el código:

```bash
cd webhook

# Access Token de PRODUCCIÓN de MercadoPago
# (MercadoPago → Tu negocio → Credenciales → Producción → Access Token)
npx wrangler secret put MP_ACCESS_TOKEN

# API Key de Resend (del paso 1)
npx wrangler secret put RESEND_API_KEY

# Tu email (para recibir alertas cuando algo falle)
npx wrangler secret put OWNER_EMAIL

# Tu número de WhatsApp sin + (ej: 573001234567)
npx wrangler secret put WHATSAPP
```

Cada comando te pide que escribas el valor en la terminal.

---

## Paso 6 — Desplegar el worker

```bash
cd webhook
npx wrangler deploy
```

Verás al final:
```
✅ despega-webhook deployed to:
   https://despega-webhook.TU-USUARIO.workers.dev
```

Copia esa URL — la necesitas en el paso 7.

Prueba que funciona:
```bash
curl https://despega-webhook.TU-USUARIO.workers.dev/
# Debe responder: Despega webhook activo ✅
```

---

## Paso 7 — Configurar el webhook en MercadoPago

1. Ve a **MercadoPago → Tu negocio → Configuración → Notificaciones → Webhooks**
2. **URL del servidor**: `https://despega-webhook.TU-USUARIO.workers.dev/`
3. **Eventos**: marca `Pagos`
4. Guarda

---

## Paso 8 — Configurar los links de pago (js/pro.js)

En **MercadoPago → Tu negocio → Links de pago**, crea 2 links:
- PRO: precio $19.900 COP
- Elite: precio $39.900 COP

Luego abre `js/pro.js` y reemplaza los placeholders:

```js
const MP_LINK_PRO   = "https://mpago.la/TU-LINK-REAL-PRO";
const MP_LINK_ELITE = "https://mpago.la/TU-LINK-REAL-ELITE";
const WHATSAPP      = "573001234567"; // tu número real
```

---

## Paso 9 — Prueba con un pago real de $1

Antes de lanzar, haz una compra de prueba:
1. Compra el plan PRO desde la app
2. Revisa que recibes el email con el código
3. Activa el código en la app y verifica que cambia a PRO

---

## Flujo completo (para referencia)

```
Cliente paga en MercadoPago
        ↓
MP llama a tu worker con el ID del pago
        ↓
Worker verifica el pago contra la API de MP
        ↓
Worker saca el primer código del pool en KV
        ↓
Worker envía email al cliente con el código
        ↓
Worker marca el pago como procesado (idempotencia)
        ↓
Cliente activa el código en la app → ¡PRO activado!
```

---

## Qué NO se modifica del frontend

- `index.html` — sin cambios
- `js/pro.js` — solo el link de MP y WhatsApp (ya los necesitabas configurar)
- `css/styles.css` — sin cambios
- Todos los demás JS — sin cambios

La carpeta `webhook/` **NO se sube al hosting estático**. Se despliega solo en Cloudflare.

---

## Cuando se agoten los códigos

El worker te enviará un email de alerta. Para agregar más:
1. Genera nuevos códigos (pídele a Claude: "genera 10 códigos PRO nuevos para Despega")
2. Agrégalos en `CODES.md` y en `js/pro.js` (sus hashes)
3. Recarga el pool: corre `node seed-codes.js` de nuevo con `--reset`

---

## Solución de problemas

**El email no llega**  
→ Revisa que el dominio esté verificado en Resend  
→ Revisa los logs del worker: `npx wrangler tail`

**Error 502 del worker**  
→ Verifica que `MP_ACCESS_TOKEN` sea el de **Producción** (no el de pruebas)

**"Sin códigos disponibles"**  
→ El pool está vacío, te llegó un email de alerta — recarga con `seed-codes.js`
