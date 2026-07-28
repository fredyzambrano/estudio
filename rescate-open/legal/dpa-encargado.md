# Contrato de encargo del tratamiento (DPA) — PLANTILLA EN BORRADOR

> ⚠️ Borrador sin revisión jurídica. Debe firmarse con **cada** proveedor que trate datos personales por cuenta de la entidad, antes de enviarle un solo dato.
> Versión: `1.0.0-borrador`

Entre `[NOMBRE DE LA ENTIDAD]`, NIT `[NIT]` (el "Responsable"), y `[NOMBRE DEL PROVEEDOR]`, `[IDENTIFICACIÓN]` (el "Encargado").

## 1. Objeto

El Encargado tratará datos personales por cuenta y bajo instrucciones del Responsable, exclusivamente para prestar el servicio de `[DESCRIPCIÓN DEL SERVICIO]`.

## 2. Alcance del tratamiento

| Elemento | Detalle |
|---|---|
| Finalidad | `[FINALIDAD ESPECÍFICA]` |
| Categorías de titulares | Personas de contacto de organizaciones donantes y receptoras; usuarios de la Plataforma |
| Categorías de datos | Nombre, cargo, correo, teléfono, organización, datos operativos, datos técnicos seudonimizados |
| Datos sensibles | **Ninguno.** El Responsable no trata datos sensibles |
| Duración | Mientras esté vigente el contrato de servicio |
| Ubicación del tratamiento | `[PAÍS / REGIÓN]` |

## 3. Obligaciones del Encargado

1. Tratar los datos **únicamente** conforme a instrucciones documentadas del Responsable, y no para fines propios.
2. No vender, ceder ni usar los datos para entrenar modelos, elaborar perfiles o publicidad.
3. Garantizar la confidencialidad de todo el personal con acceso, con compromiso escrito.
4. Implementar y mantener medidas técnicas y organizativas adecuadas: cifrado en tránsito y en reposo, control de acceso, registro de accesos, copias de seguridad.
5. No subcontratar sin autorización previa y escrita del Responsable, e imponer al subencargado las mismas obligaciones.
6. Asistir al Responsable en la atención de solicitudes de titulares dentro de `[N]` días hábiles.
7. **Notificar cualquier incidente de seguridad que afecte datos personales dentro de las `[N]` horas** siguientes a su conocimiento, con la información disponible.
8. Permitir auditorías o entregar certificaciones equivalentes.
9. Al terminar el contrato, devolver o suprimir todos los datos según instruya el Responsable, y certificar la supresión por escrito.

## 4. Obligaciones del Responsable

1. Contar con autorización válida de los titulares.
2. Impartir instrucciones lícitas y documentadas.
3. Informar al Encargado de cualquier cambio relevante en las finalidades.

## 5. Subencargados autorizados

| Subencargado | Servicio | País |
|---|---|---|
| `[NOMBRE]` | `[SERVICIO]` | `[PAÍS]` |

El Encargado notificará con `[N]` días de anticipación cualquier incorporación o cambio, y el Responsable podrá oponerse.

## 6. Transferencias internacionales

`TODO (legal)`: determinar el régimen aplicable a la transferencia según el país del Encargado y consignar aquí la base que la habilita.

## 7. Responsabilidad

`TODO (legal)`: distribución de responsabilidad entre Responsable y Encargado ante sanciones o reclamaciones derivadas del tratamiento.

## 8. Vigencia

Vigente mientras dure el contrato principal de servicio. Las obligaciones de confidencialidad y de supresión sobreviven a su terminación.

---

## Lista de proveedores que requieren este contrato

Antes de producción, verifica que cada uno tenga DPA firmado:

- [ ] Hosting de la aplicación
- [ ] Base de datos
- [ ] Almacenamiento de documentos de verificación y evidencias
- [ ] Proveedor de correo transaccional
- [ ] Analítica (si se usa)
- [ ] Herramienta de soporte o mesa de ayuda
- [ ] Copias de seguridad, si están en un proveedor distinto
- [ ] Cualquier servicio de mensajería usado para coordinar con organizaciones

---

**Firmas**

`[REPRESENTANTE RESPONSABLE]` — `[CARGO]` — `[FECHA]`

`[REPRESENTANTE ENCARGADO]` — `[CARGO]` — `[FECHA]`
