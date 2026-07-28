# Rescate Open

Infraestructura abierta para coordinar donaciones de excedentes de alimentos entre donantes y organizaciones receptoras verificadas.

> **Estado:** piloto técnico funcional. La aplicación de `app/` corre hoy en un subdominio, sin build ni backend.
> Los textos legales son plantillas y **requieren revisión de un abogado colombiano** antes de operar con datos o donaciones reales.

## Alcance del piloto

Rescate Open **no vende, compra, transporta ni manipula alimentos**. Es un intermediario tecnológico que registra ofertas, reservas y una cadena de custodia mínima. Cada donante y receptor conserva sus obligaciones sanitarias, tributarias, laborales y de transporte.

El piloto inicial debe operar con organizaciones receptoras legalmente constituidas y verificadas; no con entrega directa al público.

Esa decisión no es solo un texto en los términos: está escrita en el código.

- `app/js/core/inocuidad.js` impide publicar o entregar alimento vencido, con empaque comprometido, sin trazabilidad cuando la categoría la exige o con cadena de frío incumplida.
- `app/js/core/estados.js` es la única puerta de cambio de estado, y cruza siempre autorización + guardas sanitarias + auditoría.
- `app/js/core/rbac.js` niega por defecto: ningún permiso se concede por "estar autenticado".

## Puesta en marcha local

No hay dependencias que instalar: el proyecto usa solo Node ≥ 20 y el navegador.

```bash
cd rescate-open
npm test          # 111 pruebas del núcleo, sin dependencias externas
npm run dev       # servidor estático con las cabeceras de producción
```

Abre `http://localhost:4173`. La aplicación arranca con un escenario de demostración: cuatro organizaciones ficticias, seis donaciones en distintos estados y su cadena de auditoría.

En **Cuenta → Cambiar de rol** puedes explorar como donante, organización receptora, verificación, soporte o administración. Cada rol ve y puede cosas distintas — esa es la forma más rápida de comprobar que la autorización funciona.

## Arquitectura

```
app/
  index.html            Shell de la aplicación (7 vistas, modal, toast)
  css/rescate.css       Sistema de diseño por tokens, claro y oscuro
  js/core/              NÚCLEO — la única fuente de verdad de las reglas
    esquema.js            Validador sin dependencias (sustituto de Zod)
    rbac.js               Roles y autorización por recurso
    inocuidad.js          Reglas de bloqueo sanitario (Ley 1990 de 2019)
    estados.js            Máquina de estados de la donación
    donacion.js           Entidad, esquema y proyecciones públicas
    organizacion.js       Verificación documental manual
    consentimiento.js     Autorización de tratamiento (Ley 1581 de 2012)
    auditoria.js          Eventos encadenados por hash
    geo.js                Ubicación aproximada por diseño
    impacto.js            Métricas estimadas del piloto
    ids.js                Identificadores, códigos y hashing
  js/datos/             Catálogos operativos y semilla de demostración
  js/vistas/            Una vista por pantalla, sin framework
  js/store.js           Persistencia local del piloto (localStorage)
api/                    Cloudflare Worker + D1: el mismo núcleo en servidor
tests/                  111 pruebas con node:test
docs/                   Despliegue, seguridad, modelo de datos, runbook
legal/                  Plantillas de términos, privacidad y acuerdos
herramientas/servidor.js  Servidor estático con cabeceras de producción
```

**Decisión de diseño central:** el núcleo (`app/js/core/`) no importa nada del navegador ni del servidor. Las mismas funciones que evalúan una donación en la pantalla del donante corren en las pruebas de Node y en el Worker de Cloudflare. Una regla sanitaria se escribe una vez.

**Lo que el navegador NO decide:** el piloto local usa `localStorage` y por lo tanto es manipulable por quien abre las herramientas de desarrollo. Sirve para demostrar el flujo, no para operar. Ver `api/README.md` para el despliegue con autoridad en el servidor.

## Próximos hitos

1. Autenticación con verificación de correo y roles. *(pendiente — hoy el piloto usa un selector de rol)*
2. Flujo de verificación documental de organizaciones. *(implementado: lista de chequeo manual + motivo escrito, `app/js/vistas/verificacion.js`)*
3. Publicación y reserva de donaciones con auditoría. *(implementado: máquina de estados + cadena de hash)*
4. Notificaciones y geolocalización aproximada. *(geolocalización aproximada implementada; notificaciones pendientes)*
5. Prueba piloto cerrada con 3 donantes y 2 organizaciones. *(pendiente — requiere revisión legal previa)*

Consulta `docs/` para despliegue, seguridad, documentos legales iniciales y el prompt para Claude.

## Antes de operar de verdad

- [ ] Revisión de un abogado colombiano sobre términos, política de datos, acuerdos y modelo operativo.
- [ ] Validación de un profesional de inocuidad sobre los rangos de `app/js/datos/catalogos.js`.
- [ ] Backend real con autorización en servidor (`api/`), correo verificado y MFA para verificación y administración.
- [ ] Almacenamiento cifrado y separado de los documentos de verificación.
- [ ] Copias de seguridad con prueba mensual de restauración.

## Licencia

**AGPL-3.0-or-later**: obliga a ofrecer el código fuente a usuarios de versiones desplegadas en red, una buena protección para conservar el carácter comunitario del proyecto. Confirma esta decisión con asesoría legal antes de publicar.

El nombre y la marca `Rescate Open` no se licencian con el código: ver `NOTICE`.
