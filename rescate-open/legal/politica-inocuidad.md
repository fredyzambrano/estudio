# Política de inocuidad y criterios de aceptación — PLANTILLA EN BORRADOR

> ⚠️ Borrador sin validación técnica. **Un profesional de inocuidad alimentaria debe revisar y aprobar cada criterio de este documento antes del piloto real.**
> Versión: `1.0.0-borrador`

Este documento y el archivo `app/js/datos/catalogos.js` deben decir exactamente lo mismo. Ese archivo es la implementación; este es la explicación. Si divergen, gana el criterio del profesional de inocuidad y se corrige el código.

## Principio

Rescate Open **no certifica** la inocuidad de ningún alimento. Implementa barreras que impiden publicar lo que evidentemente no debe donarse, y exige declaraciones expresas de quien sí conoce el producto.

La barrera es de producto: no existe forma, en la interfaz ni en la API, de publicar un alimento que incumpla los criterios de bloqueo.

## Criterios de bloqueo absoluto

No se puede publicar ni entregar un alimento que:

| # | Criterio | Código en el sistema |
|---|---|---|
| 1 | Esté vencido o haya superado su fecha de consumo preferente | `VENCIDO` |
| 2 | No tenga fecha cuando la categoría la exige | `SIN_FECHA` |
| 3 | Tenga el empaque abierto, parcialmente consumido, dañado, inflado u oxidado | `EMPAQUE_COMPROMETIDO` |
| 4 | No declare el estado del empaque | `EMPAQUE_NO_DECLARADO` |
| 5 | Carezca de lote cuando la categoría lo exige | `SIN_LOTE` |
| 6 | Carezca de responsable técnico cuando la categoría lo exige | `SIN_RESPONSABLE` |
| 7 | No declare condición de conservación | `CONSERVACION_NO_DECLARADA` |
| 8 | Declare una conservación incompatible con su categoría | `CONSERVACION_INCOMPATIBLE` |
| 9 | No registre temperatura cuando hay frío o calor mantenido | `SIN_TEMPERATURA` |
| 10 | Registre temperatura fuera del criterio | `CADENA_FRIO` |
| 11 | Sea preparado sin fecha y hora de preparación | `PREPARADO_SIN_HORA` |
| 12 | Sea preparado fuera de su ventana de vida útil | `PREPARADO_FUERA_DE_VENTANA` |
| 13 | No declare alérgenos ni indique que no aplican | `ALERGENOS_NO_DECLARADOS` |
| 14 | Sea objeto de alerta sanitaria o retiro de producto | `ALERTA_SANITARIA` |
| 15 | No defina ventana de retiro, o la tenga vencida | `SIN_VENTANA_RETIRO`, `VENTANA_VENCIDA` |
| 16 | Tenga ventana de retiro que termine después del vencimiento | `RETIRO_DESPUES_DE_VENCER` |
| 17 | No tenga evidencia fotográfica | `SIN_EVIDENCIA` |
| 18 | No tenga declaración de aptitud del donante | `SIN_DECLARACION` |

## Criterios por categoría

`TODO (inocuidad)`: **validar toda esta tabla.** Los valores actuales son un punto de partida razonable, no un criterio técnico aprobado.

| Categoría | Fecha | Lote | Trazabilidad | Conservación admitida | Ventana máx. | Riesgo |
|---|---|---|---|---|---|---|
| Frutas y verduras | no | no | no | ambiente, refrigerado | 48 h | medio |
| Panadería | sí | no | no | ambiente, refrigerado, congelado | 24 h | medio |
| Abarrotes envasados | sí | sí | no | ambiente | 168 h | bajo |
| Lácteos | sí | sí | sí | refrigerado, congelado | 12 h | alto |
| Cárnicos | sí | sí | sí | refrigerado, congelado | 8 h | alto |
| Congelados | sí | sí | sí | congelado | 12 h | alto |
| Alimento preparado | sí | sí | sí | refrigerado, caliente, congelado | 4 h | crítico |
| Bebidas envasadas | sí | sí | no | ambiente, refrigerado | 72 h | bajo |

## Rangos de temperatura

`TODO (inocuidad)`: **validar contra la normativa vigente**, tomando como referencia la Resolución 2674 de 2013 y las normas específicas por tipo de alimento.

| Condición | Criterio actual |
|---|---|
| Refrigerado | 0 °C a 4 °C |
| Congelado | −18 °C o menos |
| Caliente mantenido | 60 °C o más |
| Ambiente seco | sin exigencia de registro |

## Revalidación en el momento del retiro

Un alimento apto al publicarse puede dejar de serlo mientras espera. Por eso **todas** las reglas se vuelven a evaluar con la hora del retiro antes de registrar la entrega. Si algo dejó de cumplirse, la entrega no se registra y el intento queda auditado.

Es el punto más importante de esta política: sin él, el sistema solo verificaría un momento y no un proceso.

## Criterios de rechazo en la recepción

La organización receptora **debe rechazar**, aunque la publicación estuviera en regla:

- Producto que no corresponde a lo publicado.
- Empaque comprometido al momento del retiro.
- Temperatura fuera de criterio al momento del retiro.
- Olor, color o textura anormales.
- Rotulado ilegible o fecha inconsistente.
- Ausencia de condiciones para transportarlo adecuadamente.

El rechazo se registra en el acta de recepción con la observación correspondiente.

## Alérgenos

Debe declararse la presencia de alérgenos o marcarse expresamente que no aplican. No se admite dejar el campo vacío.

`TODO (inocuidad/legal)`: confirmar la lista contra la norma de rotulado vigente y decidir si el piloto admite alimentos preparados sin rotulado industrial.

## Protocolo de incidente

Descrito en `docs/07-runbook-piloto.md`. Resumen: pausar, avisar por teléfono, preservar evidencia sin editar registros, evaluar reporte a la autoridad, reunión con las partes en 72 horas, y —si el fallo fue del sistema— cambio en las reglas **acompañado de una prueba que reproduzca el caso**.

## Retiro de producto

Si un donante recibe una alerta sanitaria sobre un lote ya donado, debe informarlo de inmediato. La Plataforma contactará a las organizaciones receptoras que lo recibieron usando el registro de la cadena de custodia — esa es la razón de que exista.

## Formación mínima

`TODO (inocuidad)`: definir qué formación se exige al personal de cada parte y si la Plataforma provee material de apoyo.
