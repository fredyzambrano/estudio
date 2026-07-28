# Base legal y operativa — Colombia

> Esto es información general, no asesoría jurídica. Antes de lanzar, un abogado colombiano con experiencia en alimentos, protección de datos y entidades sin ánimo de lucro debe adaptar y aprobar los documentos, modelo operativo y contratos.

## Decisión de riesgo para el piloto

La plataforma debe limitarse a coordinar. El donante declara la aptitud del alimento y mantiene sus registros sanitarios; la organización receptora, previamente verificada, acepta la donación y controla almacenamiento, transporte y entrega. No permitir entregas directas a personas ni cobros en el piloto.

La [Ley 1990 de 2019](https://www.suin-juriscol.gov.co/viewDocument.asp?id=30037776) crea la política colombiana contra la pérdida y desperdicio de alimentos y establece, entre otros puntos, que no son donables alimentos procesados o preparados vencidos. Es una regla de producto: el software debe impedir publicaciones que la contradigan.

**Dónde vive esa regla en el código:** `app/js/core/inocuidad.js`, código de bloqueo `VENCIDO`, con la norma citada en el propio hallazgo. Las pruebas `tests/inocuidad.test.js` fallan si alguien la debilita.

## Documentos que deben existir antes de producción

1. **Términos de uso**: partes, rol de mero intermediario tecnológico, edad mínima, reglas de uso, prohibiciones, moderación, suspensión/cierre, ley y jurisdicción, mecanismo de PQR y aceptación electrónica.
2. **Política de tratamiento de datos personales**: responsable y contacto, datos recolectados, finalidades, base/autorización, derechos, procedimiento de consultas/reclamos, transferencias internacionales, encargados, seguridad, retención y cambios. La [Ley 1581 de 2012](https://sedeelectronica.sic.gov.co/transparencia/normativa/ley-estatutaria-1581-de-2012) aplica a datos personales tratados en Colombia. La autorización debe ser previa, expresa e informada y conservada como evidencia.
3. **Aviso de privacidad**: versión corta en cada formulario, con enlace a la política completa.
4. **Acuerdo con donantes**: declaración de titularidad y aptitud, información de lote/fecha/conservación, entrega de registros cuando aplique, prohibición de publicar producto prohibido y asignación de responsabilidades.
5. **Acuerdo con organizaciones receptoras**: personería/representación, controles sanitarios y logísticos, destino gratuito, custodia, reporte de recepción, manejo de incidentes y derecho de auditoría/suspensión.
6. **Política de seguridad alimentaria**: criterios de aceptación/rechazo, cadena de frío, alérgenos, retiro de producto, cuarentena, evidencia fotográfica y protocolo de incidentes.
7. **Contrato de encargado de tratamiento (DPA)** con cada proveedor que trate datos por cuenta de la entidad: hosting, correo, analítica, soporte y almacenamiento.
8. **Política de cookies**, inventario de proveedores y consentimiento cuando sea necesario.
9. **Política de código abierto**: licencia, `NOTICE`, contribuciones (DCO o CLA), proceso de divulgación de vulnerabilidades y política de marcas.

Las plantillas de los puntos 1 a 8 están en `legal/`. Están marcadas como borradores: cada `[CORCHETE]` es un dato que debe completar la entidad operadora, y cada `TODO (legal)` es una decisión que debe tomar un abogado.

## Datos: minimización y protección

- Recoge solo nombre, correo, teléfono, rol, entidad y ubicación aproximada necesaria para coordinar. No recolectes cédula, salud, datos de menores ni ubicación domiciliaria precisa salvo necesidad documentada y revisión legal.
- Jamás publiques dirección exacta, teléfono, nombre de receptor ni documentos de verificación en un mapa público.
- Separa los documentos de verificación de la aplicación; cifra en reposo, usa URLs temporales y acceso por rol.
- Mantén un inventario de datos y un calendario de retención/borrado. Elimina o anonimiza al terminar la finalidad, salvo conservación obligatoria.
- Habilita un canal para consulta, corrección, actualización, revocatoria y supresión. La SIC explica que la política debe informar finalidades y derechos de titulares: [referencia](https://sedeelectronica.sic.gov.co/politica-de-tratamiento-de-datos-personales).

**Cómo se implementa hoy:**

| Principio | Implementación | Archivo |
|---|---|---|
| Ubicación aproximada | Las coordenadas exactas nunca se guardan; se redondean a una celda de ~1 km | `core/geo.js`, `core/donacion.js` |
| Dirección y contacto reservados | Solo se revelan a la organización que reservó, y el acceso queda auditado | `core/donacion.js` (`vistaPublica` / `vistaParaReserva`) |
| IP minimizada | Se recorta a /24 (IPv4) o /48 (IPv6) y se seudonimiza con sal antes de persistir | `core/auditoria.js` |
| Consentimiento probatorio | Se guarda versión de texto, hash de lo mostrado, canal y fecha | `core/consentimiento.js` |
| Derechos del titular | Exportar y suprimir desde la propia interfaz | `vistas/cuenta.js` |
| Campos sensibles fuera del diff | La auditoría enmascara contacto y documentos | `core/auditoria.js` (`CAMPOS_OCULTOS`) |

## Antifraude y daño intencional

- Verificación manual inicial de organizaciones: certificado de existencia/representación vigente, RUT si corresponde, dirección y responsable operativo. Evita automatizar decisiones de aprobación.
- Roles mínimos: donante, receptor, verificador, soporte y administrador; MFA obligatorio para verificador/administrador.
- Doble confirmación para cambios de cuenta bancaria, contactos críticos y dirección de retiro.
- Cada donación requiere: categoría, cantidad, lote cuando exista, fecha de vencimiento/consumo preferente, conservación, alérgenos, fotos, hora límite y declaración de aptitud.
- Bloqueo automático: vencido, empaque abierto/dañado, sin fecha cuando corresponda, alerta sanitaria, preparación sin trazabilidad o temperatura fuera de criterio.
- Auditoría con fecha, actor, IP minimizada/seudonimizada, acción y antes/después; alertas ante reservas inusuales, cuentas duplicadas y cambios repetidos.
- Botón de "reportar incidente"; protocolo de contención: pausar publicación, alertar a las partes, preservar evidencia, evaluar reporte a autoridad y notificar incidentes de datos según corresponda.

**Cómo se implementa hoy:**

- La aprobación exige lista de chequeo obligatoria completa **y** motivo escrito; nadie puede verificar su propia organización (`core/organizacion.js`, código `AUTOVERIFICACION`).
- El MFA es una condición de autorización, no una recomendación: `VERIFIER` y `ADMIN` sin segundo factor reciben `MFA_REQUERIDO` en cada permiso (`core/rbac.js`).
- La entrega física exige un código que el receptor dicta al donante en el momento del retiro: sin presencia no hay entrega registrada (`core/estados.js`, guarda `codigoEntregaValido`).
- Los intentos **bloqueados** también se auditan (`INOCUIDAD_BLOQUEO`): saber qué se quiso publicar detecta patrones antes que el daño.
- La cadena de auditoría se enlaza por hash; alterar o borrar un evento intermedio rompe la verificación y el panel lo muestra en rojo.

Pendiente por implementar: doble confirmación de cambios críticos, detección de cuentas duplicadas y alertas por reservas inusuales.

## Código abierto sin perder la marca ni la seguridad

- Publica el software bajo **AGPL-3.0-or-later** y un `CONTRIBUTING.md` con DCO. No aceptes contribuciones sin declaración de origen.
- Registra y protege la marca `Rescate Open` por separado; la licencia de software no concede permiso para aparentar afiliación.
- Crea `SECURITY.md` con un correo privado, plazo de acuse (48 h) y divulgación coordinada. Nunca aceptes vulnerabilidades por canales públicos.
- Ejecuta análisis de dependencias, secret scanning, revisión de PR y actualizaciones automáticas; firma releases.
- No publiques datos reales, claves, copias de bases, fotos identificables ni direcciones en el repositorio.

El proyecto tiene cero dependencias de terceros en tiempo de ejecución, lo que reduce a casi nada la superficie de cadena de suministro. La prueba `tests/semilla.test.js` falla si alguien introduce en la semilla correos personales o datos con apariencia real.

## Validación previa al lanzamiento

Un abogado debe decidir: entidad operadora y responsabilidades; régimen tributario; acuerdos y seguros; requisitos locales sanitarios y de transporte; rol frente a INVIMA/secretarías de salud; registro de bases de datos si resulta aplicable; transferencias internacionales de datos; mecanismo de PQR y jurisdicción. Un profesional de inocuidad debe validar los criterios por tipo de alimento y cadena de frío.

Para la revisión de inocuidad, el archivo a poner sobre la mesa es `app/js/datos/catalogos.js`: contiene, en un solo lugar y en lenguaje legible, los rangos de temperatura, las ventanas máximas por categoría y qué exige trazabilidad. Cambiar ese archivo cambia el comportamiento de bloqueo de todo el sistema.
