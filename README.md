# 🚀 Despega — De 0 a 1.000 usuarios sin gastar en ads

App web que convierte el playbook UGC (el método de "cómo conseguir tus primeras 1.000 descargas gratis")
en un producto interactivo y monetizable: el usuario define su persona, calienta el algoritmo,
genera guiones que convierten, publica con protocolo y mide hasta despegar.

**Dominio sugerido:** `despega.aprendeamonetizar.com`

---

## Qué hace

| Paso | Módulo | Qué resuelve |
|------|--------|--------------|
| 1 | **Persona** | Constructor de persona de usuario (nombre, edad, dolores, deseos) + registro de tu app |
| 2 | **Calentar** | Búsquedas sugeridas generadas desde los dolores (nunca el producto), rutina diaria de 3 días y diario de jerga |
| 3 | **Guiones** | Generador por plantillas de los 3 formatos: Hook & Demo, Texto Largo y Storytelling, en ES/EN/PT |
| 4 | **Publicar** | Ritual pre-post, reglas anti-estancamiento (máx 3/día, 2h de separación) y registro de publicaciones |
| 5 | **Métricas** | Tracker de vistas y de la métrica #1: comentarios «¿qué app es?» + ruta de hitos semana 1→8 |

Extra: dashboard con "siguiente paso" automático, racha de publicación, progreso del método,
3 idiomas (ES 🇨🇴 / EN 🇺🇸 / PT 🇧🇷) y respaldo export/import de datos.

## Monetización

- **Gratis**: método completo, 1 persona, 3 guiones/día.
- **Pro ($19.900 COP, pago único)**: personas y guiones ilimitados + insights por formato.
- **Elite ($39.900 COP, pago único)**: Pro + auditoría por WhatsApp + soporte 1:1.
- Flujo: pago por MercadoPago → envías código de activación por WhatsApp → el usuario lo activa en la app.
- Los códigos están en `CODES.md` (archivo **solo para ti**, no lo subas al hosting).
  En el código fuente solo viajan sus hashes SHA-256, nunca los códigos en texto plano.

## ⚠️ Pendientes ANTES de lanzar

1. **Links de MercadoPago** — edita las constantes en `js/pro.js`:
   - `MP_LINK_PRO` y `MP_LINK_ELITE`
2. **WhatsApp de soporte** — misma sección: constante `WHATSAPP` (formato `57XXXXXXXXXX`, sin `+`).
3. **Subir todo al hosting excepto** `CODES.md` y `README.md`.
4. La activación de códigos usa `crypto.subtle`, que requiere **HTTPS** (tu hosting ya lo tiene).

## Arquitectura

```
index.html          Shell de la app (7 vistas SPA + modales + footer legal)
css/styles.css      Sistema de diseño (tokens + componentes, dark, mobile-first)
js/i18n.js          Motor de idiomas + diccionarios ES/EN/PT completos
js/templates.js     Bancos de plantillas de guiones y búsquedas por idioma
js/store.js         Estado con localStorage, esquema versionado, export/import
js/ui.js            Toast, modales, escape de HTML, formato de números
js/persona.js       Paso 1  ·  js/warmup.js    Paso 2  ·  js/guiones.js  Paso 3
js/protocolo.js     Paso 4  ·  js/metricas.js  Paso 5
js/pro.js           Planes, activación por hash SHA-256, respaldo de datos
js/app.js           Navegación, dashboard, siguiente-acción
```

Decisiones deliberadas:

- **Sin build, sin frameworks, sin backend**: se despliega copiando la carpeta a cualquier hosting
  estático (igual que tus otros proyectos), pero modularizado para poder mantenerlo.
- **Generador por plantillas, no por API de IA**: costo $0 por generación, funciona offline y sin
  exponer API keys en el cliente. El playbook UGC es formulaico: las plantillas capturan los
  formatos mejor que un LLM genérico. Si más adelante quieres IA, el punto de integración es
  `TPL.generate()` detrás de un proxy serverless (Cloudflare Workers) que guarde la key.
- **Datos 100% locales** (localStorage) con export/import JSON: cero costos de servidor y
  argumento de privacidad real. El límite conocido: no sincroniza entre dispositivos.
- **Roadmap sugerido cuando haya tracción**: validación de códigos en servidor (hoy un usuario
  técnico puede saltarse el paywall del cliente), webhook de MercadoPago para entregar códigos
  automáticamente, y cuentas con sync.

## Desarrollo local

```bash
python3 -m http.server 8080
# → http://localhost:8080
```
