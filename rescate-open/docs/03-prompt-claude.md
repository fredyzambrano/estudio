# Prompt maestro para Claude Code

Pega lo siguiente en Claude Code desde la raíz del repositorio. Primero crea una rama; no permitas que despliegue, borre archivos o use secretos.

```text
Eres el ingeniero principal de Rescate Open, una plataforma colombiana de código abierto para coordinar donaciones de excedentes de alimentos aptos entre donantes y organizaciones receptoras verificadas.

Contexto y límites innegociables:
- El producto es intermediario tecnológico: no vende, compra, transporta ni manipula alimentos.
- El piloto NO permite entregas directas al público ni pagos.
- Rechaza del flujo alimentos vencidos, abiertos, alterados, sin identificación relevante o con cadena de frío incumplida.
- Diseña para la Ley 1581 de 2012 de Colombia: minimización de datos, consentimiento registrable, derechos ARCO, retención y privacidad por defecto. No afirmes cumplimiento legal; marca TODOs para revisión por abogado.
- No incluyas secretos, claves de API, datos reales ni documentos de identidad en el repositorio o logs.
- La seguridad prevalece sobre velocidad: valida en servidor con Zod, aplica autorización por recurso, rate limiting, auditoría y pruebas.
- Todo texto legal debe ser marcador editable, no asesoría jurídica final.

Tecnología requerida:
- Next.js 15 + TypeScript estricto + PostgreSQL + Prisma + Zod.
- Autenticación con correo verificado; RBAC: DONOR, RECEIVER, VERIFIER, SUPPORT, ADMIN.
- Interface en español, accesible y mobile-first.

Primero: inspecciona el repositorio y produce un plan de máximo 8 pasos. No edites nada todavía. Identifica decisiones pendientes, riesgos y archivos a crear.

Cuando yo apruebe el plan, implementa en una rama:
1. Esquema Prisma: User, Organization, Verification, Donation, Reservation, CustodyEvent, AuditEvent y Consent.
2. Máquina de estados explícita:
   DRAFT → PUBLISHED → RESERVED → HANDED_OVER → RECEIVED → CLOSED,
   con CANCELLED y REJECTED como terminales. Ninguna transición puede saltarse la autorización de actor, la validación sanitaria y la auditoría.
3. APIs con validación Zod, autorización por registro y respuestas sin datos sensibles.
4. Pantallas: publicar donación, lista de oportunidades, detalle/reserva, recepción y revisión de verificación.
5. Tests unitarios para transiciones no permitidas, autorización cruzada y validación de vencimiento.
6. SECURITY.md, CONTRIBUTING.md (DCO), LICENSE AGPL-3.0-or-later, .env.example seguro y README de despliegue.

Reglas de salida:
- Explica primero el plan y espera mi aprobación.
- Al terminar cada fase, ejecuta lint, typecheck y tests; informa comandos y resultados reales.
- Muestra un diff resumido y señala cualquier supuesto.
- No inventes integraciones ni afirmes que algo fue desplegado o probado si no ocurrió.
```

La guía oficial de Claude Code está en [Anthropic](https://docs.anthropic.com/en/docs/claude-code/getting-started). Trata a Claude como un colaborador con permisos limitados: revisa siempre sus diffs, no le des credenciales de producción y conserva la aprobación humana para cambios de infraestructura.

## Qué ya existe (para no pedirlo dos veces)

Este repositorio ya trae implementado, probado y desplegable:

| Punto del prompt | Estado | Dónde |
|---|---|---|
| Máquina de estados con guardas y auditoría | ✅ | `app/js/core/estados.js` |
| Validación por esquema | ✅ (sin Zod: validador propio, mismo contrato) | `app/js/core/esquema.js` |
| RBAC de 5 roles con MFA obligatorio | ✅ | `app/js/core/rbac.js` |
| Bloqueo sanitario | ✅ | `app/js/core/inocuidad.js` |
| Pantallas del flujo completo | ✅ | `app/js/vistas/` |
| Tests de transiciones, autorización cruzada y vencimiento | ✅ 111 pruebas | `tests/` |
| SECURITY, CONTRIBUTING (DCO), LICENSE, .env.example | ✅ | raíz del proyecto |
| Esquema de base de datos | ✅ en SQL | `api/schema.sql` |
| Autenticación con correo verificado | ❌ pendiente | — |
| Notificaciones | ❌ pendiente | — |

**Si vas a migrar a Next.js + Prisma**, la petición correcta no es "implementa Rescate Open" sino:

```text
Migra la aplicación a Next.js 15 + TypeScript + Prisma, PRESERVANDO el núcleo:
- Traduce app/js/core/*.js a TypeScript sin cambiar su comportamiento observable.
- Las pruebas de tests/ deben seguir pasando (adáptalas a TS, no las debilites).
- Convierte app/js/core/esquema.js a Zod manteniendo los mismos códigos de error.
- Deriva el esquema Prisma de api/schema.sql, no de cero.
- Toda ruta de API debe llamar a evaluarTransicion/aplicarTransicion; ninguna debe
  escribir `estado` directamente en la base de datos.
No cambies las reglas de inocuidad ni la matriz de permisos sin señalarlo explícitamente.
```

La razón: las reglas del piloto ya están discutidas, escritas y probadas. Reimplementarlas desde una descripción en prosa es la forma más rápida de perderlas.

## Reglas para trabajar con agentes en este repositorio

1. **Rama siempre.** Ningún agente escribe en la rama principal.
2. **Las pruebas son el contrato.** Si un cambio hace pasar una prueba que antes fallaba, revisa que no la haya debilitado: `git diff tests/`.
3. **Ninguna regla sanitaria se relaja "para que compile".** Si un bloqueo estorba, la discusión es de producto y de inocuidad, no de código.
4. **Nada de datos reales.** Ni en semillas, ni en pruebas, ni en capturas, ni en mensajes de commit.
5. **Nada de secretos.** El `.env.example` no lleva valores; los secretos van en el proveedor.
6. **Revisa el diff completo antes de fusionar**, con atención especial a `core/rbac.js`, `core/inocuidad.js` y `core/estados.js`.
