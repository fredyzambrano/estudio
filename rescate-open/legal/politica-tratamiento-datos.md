# Política de tratamiento de datos personales — PLANTILLA EN BORRADOR

> ⚠️ Borrador sin revisión jurídica. Debe ser adaptada y aprobada por un abogado colombiano antes de tratar datos personales reales.
> Versión: `1.0.0-borrador` · Vigente desde: `[FECHA]`

Elaborada tomando como marco la [Ley 1581 de 2012](https://sedeelectronica.sic.gov.co/transparencia/normativa/ley-estatutaria-1581-de-2012) y sus normas reglamentarias.

## 1. Responsable del tratamiento

`[NOMBRE DE LA ENTIDAD]` · NIT `[NIT]` · `[DIRECCIÓN]`, `[CIUDAD]`, Colombia
Correo para ejercicio de derechos: `[CORREO HABEAS DATA]` · Teléfono: `[TELÉFONO]`
Responsable interno: `[CARGO]`

## 2. Principio rector: recolectar lo mínimo

Solo se recolectan datos necesarios para coordinar una donación y dejar trazabilidad de la cadena de custodia.

**No se recolectan** documentos de identidad de usuarios finales, datos de salud, datos de menores, datos biométricos, datos de ubicación domiciliaria precisa ni datos sensibles de ninguna clase.

## 3. Datos que se tratan

| Categoría | Datos | Finalidad |
|---|---|---|
| Identificación de contacto | Nombre, cargo, correo, teléfono | Coordinar la donación y contactar en la operación |
| Organización | Razón social, NIT, dirección operativa, capacidad declarada | Verificación y habilitación |
| Verificación documental | Referencia y huella de los documentos aportados | Diligencia en la admisión |
| Operación | Publicaciones, reservas, entregas, actas, evidencias | Trazabilidad de la cadena de custodia |
| Técnicos | Dirección IP **recortada y seudonimizada**, familia de navegador, fecha y hora | Seguridad, auditoría y prevención de fraude |
| Consentimiento | Versión aceptada, huella del texto mostrado, canal, fecha | Prueba de la autorización |

**Sobre la dirección IP:** nunca se almacena completa. Se recorta al bloque de red (/24 en IPv4, /48 en IPv6) y luego se transforma con una función irreversible y una sal secreta. El resultado permite detectar patrones de abuso sin identificar una conexión concreta.

**Sobre la ubicación:** de los puntos de retiro se conserva únicamente una posición aproximada a un radio de aproximadamente un kilómetro. Las coordenadas exactas no se almacenan en ningún momento. La dirección textual de retiro se revela únicamente a la organización que ya reservó, y ese acceso queda registrado.

## 4. Finalidades

**Esenciales** (sin ellas no es posible prestar el servicio):

1. Coordinar la publicación, reserva y entrega de donaciones.
2. Conservar la trazabilidad y la cadena de custodia, y atender incidentes o reclamaciones.
3. Enviar avisos operativos sobre las donaciones propias.

**Opcionales** (se pueden aceptar o rechazar por separado, y revocar en cualquier momento):

4. Producir estadísticas agregadas de impacto, sin identificar personas ni organizaciones.
5. Enviar comunicaciones sobre el proyecto.

## 5. Autorización

La autorización es previa, expresa e informada. Se solicita antes de cualquier tratamiento, en la propia aplicación, mostrando este texto y las finalidades por separado.

Se conserva como evidencia: usuario, fecha y hora, canal, versiones de los textos vigentes y una huella criptográfica del contenido exacto que se mostró. Esa huella permite demostrar, después, qué leyó el titular.

Cuando esta política o los términos cambian de versión, la autorización anterior deja de considerarse vigente y se solicita de nuevo.

## 6. Derechos del titular

Toda persona cuyos datos se traten puede:

- **Conocer** qué datos suyos existen y cómo se usan.
- **Actualizar** y **rectificar** datos parciales, inexactos o desactualizados.
- **Solicitar prueba** de la autorización otorgada.
- **Revocar** la autorización y **solicitar la supresión** de sus datos, salvo cuando exista deber legal o contractual de conservarlos.
- **Presentar quejas** ante la Superintendencia de Industria y Comercio, una vez agotado el trámite ante el responsable.

En la aplicación, el titular puede exportar todos sus datos y suprimirlos desde la sección **Cuenta**, sin necesidad de solicitud previa.

## 7. Cómo ejercer los derechos

Escribir a `[CORREO HABEAS DATA]` indicando nombre, datos de contacto, descripción de la solicitud y documentos que la sustenten.

`TODO (legal)`: consignar los plazos de respuesta para consultas y reclamos aplicables según la norma vigente, y el procedimiento cuando la solicitud está incompleta.

Responsable de atender solicitudes: `[CARGO]`.

## 8. Encargados y proveedores

`TODO (legal)`: completar con los proveedores efectivamente contratados y firmar un contrato de encargo con cada uno antes de enviarles datos.

| Proveedor | Servicio | País de tratamiento | Contrato de encargo |
|---|---|---|---|
| `[HOSTING]` | Alojamiento de la aplicación | `[PAÍS]` | `[SÍ/NO]` |
| `[BASE DE DATOS]` | Almacenamiento | `[PAÍS]` | `[SÍ/NO]` |
| `[CORREO]` | Notificaciones | `[PAÍS]` | `[SÍ/NO]` |
| `[ALMACENAMIENTO]` | Documentos de verificación | `[PAÍS]` | `[SÍ/NO]` |

## 9. Transferencias internacionales

Si algún proveedor trata datos fuera de Colombia, debe indicarse aquí junto con la base que habilita la transferencia. `TODO (legal)`: determinar el régimen aplicable según el país del proveedor elegido.

## 10. Medidas de seguridad

- Cifrado en tránsito (HTTPS obligatorio) y en reposo para documentos de verificación.
- Control de acceso por rol y por pertenencia al recurso; segundo factor obligatorio para roles de verificación y administración.
- Registro de auditoría encadenado criptográficamente, que no admite edición ni borrado.
- Minimización y seudonimización de datos técnicos.
- Copias de seguridad cifradas, con prueba periódica de restauración.
- Separación entre los documentos de verificación y la aplicación.

Ninguna medida elimina por completo el riesgo. Ante un incidente de seguridad que afecte datos personales se activa el protocolo descrito en la documentación operativa.

## 11. Retención

Los datos se conservan mientras dure la finalidad que justificó su recolección y los plazos legales aplicables. Cumplido el plazo se suprimen o se anonimizan de forma irreversible.

`TODO (legal)`: fijar los plazos definitivos. La propuesta de trabajo está en `docs/04-modelo-de-datos.md`.

## 12. Menores de edad

La Plataforma no está dirigida a menores de edad y no recolecta sus datos de manera consciente. Si se detecta el registro de un menor, se suprimen los datos.

## 13. Vigencia y cambios

Vigente desde `[FECHA]`. Los cambios se publican con número de versión y fecha. Los cambios sustanciales se comunican y requieren nueva autorización.
